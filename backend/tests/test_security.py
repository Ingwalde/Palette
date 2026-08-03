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
