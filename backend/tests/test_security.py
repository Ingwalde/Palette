import jwt

from app import models
from app.security import (
    ALGORITHM,
    create_access_token,
    hash_password,
    verify_password,
)
from app.config import SECRET_KEY


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


def test_hash_format():
    stored = hash_password("pw")
    name, iterations, salt, digest = stored.split("$", 3)
    assert name == "pbkdf2_sha256"
    assert int(iterations) >= 210_000
    assert len(salt) == 32  # 16 bytes hex


def test_access_token_carries_claims():
    user = models.User(id=7, username="carol", email="carol@test.com", is_admin=True)
    token = create_access_token(user)
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    assert payload["sub"] == "7"
    assert payload["username"] == "carol"
    assert payload["is_admin"] is True
    assert "exp" in payload
