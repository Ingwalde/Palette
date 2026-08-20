import asyncio

import jwt
from app import models
from app.config import settings
from app.security import (
    ALGORITHM,
    _pbkdf2_hash,
    create_access_token,
    hash_password,
    password_needs_rehash,
    verify_password,
    verify_password_async,
)


def test_hash_verify_round_trip():
    stored = hash_password("correct horse")
    assert verify_password("correct horse", stored) is True


def test_verify_rejects_wrong_password():
    stored = hash_password("correct horse")
    assert verify_password("wrong horse", stored) is False


def test_verify_rejects_malformed_hash():
    assert verify_password("anything", "not-a-valid-hash") is False


def test_hash_uses_random_salt():
    # Same password hashed twice must differ (random per-hash salt).
    assert hash_password("same") != hash_password("same")


def test_hash_format_is_argon2():
    stored = hash_password("pw")
    assert stored.startswith("$argon2id$")
    assert password_needs_rehash(stored) is False


def test_legacy_pbkdf2_hash_verifies_and_needs_rehash():
    salt = "00112233445566778899aabbccddeeff"
    legacy = f"pbkdf2_sha256$210000${salt}${_pbkdf2_hash('correct horse', salt)}"
    assert verify_password("correct horse", legacy) is True
    assert verify_password("wrong horse", legacy) is False
    assert password_needs_rehash(legacy) is True


def test_access_token_carries_claims():
    user = models.User(id=7, username="carol", email="carol@test.com", is_admin=True)
    token = create_access_token(user)
    payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    assert payload["sub"] == "7"
    assert payload["username"] == "carol"
    assert payload["is_admin"] is True
    assert "exp" in payload


def test_pinned_argon2_parameters_do_not_trigger_a_rehash():
    """Pinning the cost must match what the library currently defaults to.

    password_needs_rehash compares a stored hash against the configured parameters, so pinning
    them to anything other than the values already in use would mark every existing hash
    outdated and rewrite it on the owner's next login — a write on every sign-in, for everyone,
    triggered by a config change nobody associated with it.
    """
    hashed = hash_password("some-password")
    assert password_needs_rehash(hashed) is False


async def test_hashing_leaves_the_event_loop_free():
    """Argon2 must not run on the event loop.

    It costs ~100ms and 64 MiB per call by design — that expense is the algorithm working. The
    problem is where it is spent: on the loop, one login blocks every other request in the
    process, including the readiness probe, and the login rate limit of five a minute per IP
    means a handful of IPs can stall the API without looking like an attack.

    What is asserted is loop liveness, not throughput. Throughput would not improve anyway:
    each hash asks for four lanes and the container has four cores, so concurrent hashes
    saturate the machine no matter where they run. The property that matters is that other
    coroutines keep being scheduled while one is in flight.
    """
    stored = hash_password("liveness-probe")
    ticks = 0
    running = True

    async def heartbeat() -> None:
        nonlocal ticks
        while running:
            ticks += 1
            await asyncio.sleep(0)

    beat = asyncio.create_task(heartbeat())
    await asyncio.sleep(0)  # let it start
    assert await verify_password_async("liveness-probe", stored) is True
    running = False
    await beat

    # The point of the test: the heartbeat kept ticking while the ~100 ms hash was in flight,
    # so verify ran off the loop. On the loop it would have blocked every ticks += 1 until it
    # returned, and this would be 0.
    assert ticks > 0

    # On the loop this would be a handful at most: the coroutine cannot run at all while a
    # blocking call holds the thread. Off the loop it runs thousands of times.
    assert ticks > 100, f"loop only advanced {ticks} times during a verify — still blocking"


def test_verify_rejects_a_damaged_argon2_hash():
    """A hash that cannot be parsed is a failed verification, not a server error.

    A wrong password raises VerifyMismatchError, but a truncated or otherwise damaged stored
    hash raises the VerificationError base class. Catching only the subclass turned a corrupt
    row into a 500 — an error report for something no caller can act on.
    """
    stored = hash_password("some-password")
    damaged = stored[: len(stored) // 2]

    assert verify_password("some-password", damaged) is False
