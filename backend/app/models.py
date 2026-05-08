import json
from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Palette(Base):
    __tablename__ = "palettes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    colors_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    tags_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    @property
    def colors(self) -> list[str]:
        return json.loads(self.colors_json or "[]")

    @colors.setter
    def colors(self, value: list[str]) -> None:
        self.colors_json = json.dumps(value)

    @property
    def tags(self) -> list[str]:
        return json.loads(self.tags_json or "[]")

    @tags.setter
    def tags(self, value: list[str]) -> None:
        self.tags_json = json.dumps(value)
