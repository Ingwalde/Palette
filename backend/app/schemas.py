import re
from collections.abc import Iterable
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

HEX_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,40}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


# Shared field normalizers, reused by the validators below so each rule lives once.
# Minimum password length. Twelve rather than six, and length rather than a character-class
# rule: a mandated symbol and digit mostly produces "Password1!", while length is what actually
# costs an attacker work. NIST 800-63B says the same and explicitly advises against composition
# rules.
MIN_PASSWORD_LENGTH = 12

# Refused outright. Not a breach corpus — shipping one would mean a megabyte of data and an
# update process nobody would run — but the handful that a list of any size would start with,
# plus the words specific to this application. The real defence is the length floor; this
# catches the passwords long enough to pass it and still guessed first.
_COMMON_PASSWORDS = frozenset(
    {
        "123456789012",
        "password1234",
        "qwertyuiop12",
        "111111111111",
        "adminadmin12",
        "letmeinletme",
        "palettepalet",
        "passwordpass",
        "iloveyouilov",
    }
)


def validate_password_strength(password: str, *, context: Iterable[str] = ()) -> str:
    """Reject the passwords that are guessed first, and say why.

    `context` carries values from the same request — username, email — because a password that
    contains the account name is guessed immediately no matter how long it is. Kept as an
    argument rather than read from the model so the rule works for a reset, where the schema
    holds a token and no identity at all.
    """
    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")

    lowered = password.lower()
    if lowered in _COMMON_PASSWORDS:
        raise ValueError("Password is too common — choose something less predictable")

    for value in context:
        if value and len(value) >= 4 and value.lower() in lowered:
            raise ValueError("Password must not contain your username or email")

    return password


def normalize_username(username: str) -> str:
    username = username.strip()
    if not USERNAME_PATTERN.match(username):
        raise ValueError("Username can contain only letters, numbers, underscore and hyphen")
    return username


def normalize_email(email: str) -> str:
    email = email.strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise ValueError("Enter a valid email address")
    return email


def normalize_hex_colors(colors: list[str]) -> list[str]:
    normalized = []
    for color in colors:
        color = color.strip()
        if not HEX_PATTERN.match(color):
            raise ValueError(f"Invalid HEX color: {color}")
        normalized.append(color.upper())
    return normalized


def _clean_tag(tag: str) -> str:
    return tag.strip().lower().replace("#", "")


def normalize_tag(tag: str) -> str:
    """Clean a single tag, rejecting an empty one.

    Raises rather than returns "" because this is the tag *being named* — creating or renaming a
    tag to nothing is an error the caller should see, not a silent no-op."""
    cleaned = _clean_tag(tag)
    if not cleaned:
        raise ValueError("Tag cannot be empty")
    return cleaned


def normalize_tags(tags: list[str]) -> list[str]:
    """Clean a palette's tag list, dropping blanks and de-duplicating.

    Drops rather than raises, on purpose and unlike normalize_tag: a blank entry in a list is
    noise to skip, not a request to reject the whole palette. The two share _clean_tag so the
    cleaning itself cannot drift between them."""
    cleaned = [c for tag in tags if (c := _clean_tag(tag))]
    return list(dict.fromkeys(cleaned))


TAG_KINDS = ("free", "purpose")


class PaletteBase(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=1000)
    colors: list[str] = Field(min_length=1, max_length=8)
    tags: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("colors")
    @classmethod
    def _normalize_colors(cls, colors: list[str]) -> list[str]:
        return normalize_hex_colors(colors)

    @field_validator("tags")
    @classmethod
    def _normalize_tags(cls, tags: list[str]) -> list[str]:
        return normalize_tags(tags)


class PaletteCreate(PaletteBase):
    slug: str | None = Field(default=None, max_length=120)


VISIBILITIES = ("private", "public")


class PaletteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    colors: list[str] | None = Field(default=None, min_length=1, max_length=8)
    tags: list[str] | None = Field(default=None, max_length=12)
    # Publish/unpublish rides on the same PATCH: "public" makes it visible and stamps published_at,
    # "private" hides it again.
    visibility: str | None = Field(default=None)

    @field_validator("colors")
    @classmethod
    def _normalize_colors(cls, colors: list[str] | None) -> list[str] | None:
        return None if colors is None else normalize_hex_colors(colors)

    @field_validator("tags")
    @classmethod
    def _normalize_tags(cls, tags: list[str] | None) -> list[str] | None:
        return None if tags is None else normalize_tags(tags)

    @field_validator("visibility")
    @classmethod
    def _validate_visibility(cls, visibility: str | None) -> str | None:
        if visibility is None:
            return None
        if visibility not in VISIBILITIES:
            raise ValueError(f"visibility must be one of {', '.join(VISIBILITIES)}")
        return visibility


class PaletteRead(PaletteBase):
    id: int
    slug: str
    # The owner's handle, read from the Palette.owner_handle property — the curator handle for a
    # seed palette. The frontend builds the /u/:handle/:slug URL from it, so it is always present.
    owner_handle: str
    visibility: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaletteList(BaseModel):
    items: list[PaletteRead]
    total: int
    limit: int
    offset: int


class TagBase(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    kind: str = Field(default="free")

    @field_validator("name")
    @classmethod
    def _normalize_name(cls, name: str) -> str:
        return normalize_tag(name)

    @field_validator("kind")
    @classmethod
    def _validate_kind(cls, kind: str) -> str:
        kind = kind.strip().lower()
        if kind not in TAG_KINDS:
            raise ValueError(f"kind must be one of {', '.join(TAG_KINDS)}")
        return kind


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    kind: str | None = Field(default=None)

    @field_validator("name")
    @classmethod
    def _normalize_name(cls, name: str | None) -> str | None:
        return None if name is None else normalize_tag(name)

    @field_validator("kind")
    @classmethod
    def _validate_kind(cls, kind: str | None) -> str | None:
        if kind is None:
            return None
        kind = kind.strip().lower()
        if kind not in TAG_KINDS:
            raise ValueError(f"kind must be one of {', '.join(TAG_KINDS)}")
        return kind


class TagRead(BaseModel):
    name: str
    kind: str
    count: int


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=40)

    @field_validator("username")
    @classmethod
    def _normalize_username(cls, username: str) -> str:
        return normalize_username(username)


class UserCreate(UserBase):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, email: str) -> str:
        return normalize_email(email)

    @field_validator("password")
    @classmethod
    def _check_password_strength(cls, password: str, info) -> str:
        # username and email are declared before password, so they are already validated and
        # available here — which is what lets the check reject a password containing either.
        context = [info.data.get("username") or "", info.data.get("email") or ""]
        return validate_password_strength(password, context=context)


class UserLogin(BaseModel):
    # Login identifier may be a username OR an email, so it must not use the
    # strict username pattern. authenticate_user() decides which by the "@".
    username: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)
    confirm_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _check_password_strength(cls, password: str) -> str:
        return validate_password_strength(password)

    @field_validator("confirm_password")
    @classmethod
    def validate_password_confirmation(cls, confirm_password: str, info) -> str:
        new_password = info.data.get("new_password")

        if new_password and confirm_password != new_password:
            raise ValueError("Password confirmation does not match")

        return confirm_password


class AccountDeleteRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class UserRead(UserBase):
    id: int
    email: str
    is_admin: bool
    email_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResendVerificationRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, email: str) -> str:
        return normalize_email(email)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, email: str) -> str:
        return normalize_email(email)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=1)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)
    confirm_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)

    @field_validator("new_password")
    @classmethod
    def _check_password_strength(cls, password: str) -> str:
        return validate_password_strength(password)

    @field_validator("confirm_password")
    @classmethod
    def validate_password_confirmation(cls, confirm_password: str, info) -> str:
        new_password = info.data.get("new_password")

        if new_password and confirm_password != new_password:
            raise ValueError("Password confirmation does not match")

        return confirm_password


class MessageResponse(BaseModel):
    message: str
