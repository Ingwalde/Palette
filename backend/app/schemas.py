import re
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

HEX_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


class PaletteBase(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=1000)
    colors: list[str] = Field(min_length=1, max_length=8)
    tags: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("colors")
    @classmethod
    def validate_colors(cls, colors: list[str]) -> list[str]:
        normalized_colors = []

        for color in colors:
            color = color.strip()
            if not HEX_PATTERN.match(color):
                raise ValueError(f"Invalid HEX color: {color}")
            normalized_colors.append(color.upper())

        return normalized_colors

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, tags: list[str]) -> list[str]:
        cleaned_tags = []

        for tag in tags:
            cleaned_tag = tag.strip().lower().replace("#", "")
            if cleaned_tag:
                cleaned_tags.append(cleaned_tag)

        return list(dict.fromkeys(cleaned_tags))


class PaletteCreate(PaletteBase):
    slug: str | None = Field(default=None, max_length=120)


class PaletteUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=1000)
    colors: list[str] | None = Field(default=None, min_length=1, max_length=8)
    tags: list[str] | None = Field(default=None, max_length=12)

    @field_validator("colors")
    @classmethod
    def validate_colors(cls, colors: list[str] | None) -> list[str] | None:
        if colors is None:
            return None

        normalized_colors = []
        for color in colors:
            color = color.strip()
            if not HEX_PATTERN.match(color):
                raise ValueError(f"Invalid HEX color: {color}")
            normalized_colors.append(color.upper())
        return normalized_colors

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, tags: list[str] | None) -> list[str] | None:
        if tags is None:
            return None

        cleaned_tags = []
        for tag in tags:
            cleaned_tag = tag.strip().lower().replace("#", "")
            if cleaned_tag:
                cleaned_tags.append(cleaned_tag)
        return list(dict.fromkeys(cleaned_tags))


class PaletteRead(PaletteBase):
    id: int
    slug: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
