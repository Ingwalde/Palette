import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

HEX_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,40}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


# Shared field normalizers, reused by the validators below so each rule lives once.
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


def normalize_tags(tags: list[str]) -> list[str]:
    cleaned = []
    for tag in tags:
        cleaned_tag = tag.strip().lower().replace("#", "")
        if cleaned_tag:
            cleaned.append(cleaned_tag)
    return list(dict.fromkeys(cleaned))


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


class PaletteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    colors: list[str] | None = Field(default=None, min_length=1, max_length=8)
    tags: list[str] | None = Field(default=None, max_length=12)

    @field_validator("colors")
    @classmethod
    def _normalize_colors(cls, colors: list[str] | None) -> list[str] | None:
        return None if colors is None else normalize_hex_colors(colors)

    @field_validator("tags")
    @classmethod
    def _normalize_tags(cls, tags: list[str] | None) -> list[str] | None:
        return None if tags is None else normalize_tags(tags)


class PaletteRead(PaletteBase):
    id: int
    slug: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaletteList(BaseModel):
    items: list[PaletteRead]
    total: int
    limit: int
    offset: int


class UserBase(BaseModel):
    username: str = Field(min_length=3, max_length=40)

    @field_validator("username")
    @classmethod
    def _normalize_username(cls, username: str) -> str:
        return normalize_username(username)


class UserCreate(UserBase):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=6, max_length=128)

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, email: str) -> str:
        return normalize_email(email)


class UserLogin(BaseModel):
    # Login identifier may be a username OR an email, so it must not use the
    # strict username pattern. authenticate_user() decides which by the "@".
    username: str = Field(min_length=1, max_length=254)
    password: str = Field(min_length=1, max_length=128)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)
    confirm_password: str = Field(min_length=6, max_length=128)

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


class MessageResponse(BaseModel):
    message: str


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)
