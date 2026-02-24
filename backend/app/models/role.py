from __future__ import annotations

import enum
import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class RoleName(str, enum.Enum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    ADMIN = "ADMIN"


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[RoleName] = mapped_column(
        Enum(RoleName, name="role_name"), unique=True
    )

    users: Mapped[list["User"]] = relationship(back_populates="role")
