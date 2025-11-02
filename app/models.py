from __future__ import annotations

from datetime import datetime, date
from enum import Enum
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    CheckConstraint,
    Enum as SqlEnum,
    ForeignKey,
    Index,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def _uuid() -> str:
    return str(uuid4())


class OrganisationCategory(str, Enum):
    department = "department"
    warehouse = "warehouse"
    archive = "archive"
    vendor = "vendor"


class AssetStatus(str, Enum):
    active = "active"
    spare = "spare"
    repair = "repair"
    retired = "retired"


class OperationState(str, Enum):
    normal = "normal"
    incident = "incident"
    repair = "repair"
    decommissioned = "decommissioned"


class RelationType(str, Enum):
    attached_to = "attached_to"
    peripheral_of = "peripheral_of"


class EventAction(str, Enum):
    created = "created"
    assignment_started = "assignment_started"
    assignment_ended = "assignment_ended"
    status_changed = "status_changed"
    location_changed = "location_changed"
    note = "note"


class OrganisationUnit(Base):
    __tablename__ = "organisation_units"

    id: Mapped[str] = mapped_column(primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(index=True)
    category: Mapped[OrganisationCategory] = mapped_column(SqlEnum(OrganisationCategory))
    description: Mapped[Optional[str]]

    assets: Mapped[list["Asset"]] = relationship(back_populates="location")


class Person(Base):
    __tablename__ = "people"

    id: Mapped[str] = mapped_column(primary_key=True, default=_uuid)
    full_name: Mapped[str] = mapped_column(index=True)
    username: Mapped[Optional[str]] = mapped_column(unique=True)
    email: Mapped[Optional[str]] = mapped_column(unique=True)
    company: Mapped[Optional[str]]
    department_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("organisation_units.id", ondelete="SET NULL")
    )
    reports_to_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("people.id", ondelete="SET NULL")
    )

    department: Mapped[Optional[OrganisationUnit]] = relationship(foreign_keys=[department_id])
    reports_to: Mapped[Optional["Person"]] = relationship(remote_side=[id])
    assignments: Mapped[list["Assignment"]] = relationship(back_populates="person")


class AssetType(Base):
    __tablename__ = "asset_types"

    id: Mapped[str] = mapped_column(primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(unique=True)
    category: Mapped[str] = mapped_column(index=True)
    description: Mapped[Optional[str]]

    models: Mapped[list["AssetModel"]] = relationship(back_populates="asset_type")


class AssetModel(Base):
    __tablename__ = "asset_models"

    id: Mapped[str] = mapped_column(primary_key=True, default=_uuid)
    manufacturer: Mapped[Optional[str]]
    model_number: Mapped[str] = mapped_column(index=True)
    asset_type_id: Mapped[str] = mapped_column(
        ForeignKey("asset_types.id", ondelete="CASCADE"), index=True
    )
    default_description: Mapped[Optional[str]]

    asset_type: Mapped[AssetType] = relationship(back_populates="models")
    assets: Mapped[list["Asset"]] = relationship(back_populates="asset_model")

    __table_args__ = (UniqueConstraint("manufacturer", "model_number", name="uq_model_unique"),)


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(primary_key=True, default=_uuid)
    asset_tag: Mapped[Optional[str]] = mapped_column(unique=True, index=True)
    serial_number: Mapped[Optional[str]] = mapped_column(unique=True, index=True)
    asset_model_id: Mapped[str] = mapped_column(
        ForeignKey("asset_models.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[AssetStatus] = mapped_column(
        SqlEnum(AssetStatus), default=AssetStatus.spare, index=True
    )
    operation_state: Mapped[OperationState] = mapped_column(
        SqlEnum(OperationState), default=OperationState.normal
    )
    purchase_date: Mapped[Optional[date]]
    supplier: Mapped[Optional[str]]
    description: Mapped[Optional[str]]
    location_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("organisation_units.id", ondelete="SET NULL"), index=True
    )
    notes: Mapped[Optional[str]]

    asset_model: Mapped[AssetModel] = relationship(back_populates="assets")
    location: Mapped[Optional[OrganisationUnit]] = relationship(back_populates="assets")
    assignments: Mapped[list["Assignment"]] = relationship(
        back_populates="asset", order_by="desc(Assignment.start_date)"
    )
    relationships: Mapped[list["AssetRelationship"]] = relationship(
        back_populates="parent", foreign_keys="AssetRelationship.parent_asset_id"
    )
    related_to: Mapped[list["AssetRelationship"]] = relationship(
        back_populates="child", foreign_keys="AssetRelationship.child_asset_id"
    )
    events: Mapped[list["AssetEvent"]] = relationship(back_populates="asset")

    __table_args__ = (
        Index("ix_assets_status_location", "status", "location_id"),
        CheckConstraint("status != 'active' OR location_id IS NOT NULL", name="chk_location_required"),
    )


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), index=True)
    person_id: Mapped[str] = mapped_column(ForeignKey("people.id", ondelete="CASCADE"), index=True)
    start_date: Mapped[datetime] = mapped_column(default=func.now())
    end_date: Mapped[Optional[datetime]]
    expected_return_date: Mapped[Optional[datetime]]
    primary_device: Mapped[bool] = mapped_column(default=True)
    notes: Mapped[Optional[str]]

    asset: Mapped[Asset] = relationship(back_populates="assignments")
    person: Mapped[Person] = relationship(back_populates="assignments")

    __table_args__ = (
        CheckConstraint(
            "(end_date IS NULL) OR (end_date >= start_date)", name="chk_assignment_dates"
        ),
    )


class AssetRelationship(Base):
    __tablename__ = "asset_relationships"

    id: Mapped[str] = mapped_column(primary_key=True, default=_uuid)
    parent_asset_id: Mapped[str] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), index=True
    )
    child_asset_id: Mapped[str] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"), index=True
    )
    relation_type: Mapped[RelationType] = mapped_column(SqlEnum(RelationType))

    parent: Mapped[Asset] = relationship(
        back_populates="relationships", foreign_keys=[parent_asset_id]
    )
    child: Mapped[Asset] = relationship(back_populates="related_to", foreign_keys=[child_asset_id])

    __table_args__ = (
        UniqueConstraint(
            "parent_asset_id", "child_asset_id", "relation_type", name="uq_relationship_unique"
        ),
        CheckConstraint("parent_asset_id != child_asset_id", name="chk_self_relationship"),
    )


class AssetEvent(Base):
    __tablename__ = "asset_events"

    id: Mapped[str] = mapped_column(primary_key=True, default=_uuid)
    asset_id: Mapped[str] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), index=True)
    action: Mapped[EventAction] = mapped_column(SqlEnum(EventAction))
    actor: Mapped[Optional[str]]
    from_status: Mapped[Optional[AssetStatus]] = mapped_column(SqlEnum(AssetStatus), nullable=True)
    to_status: Mapped[Optional[AssetStatus]] = mapped_column(SqlEnum(AssetStatus), nullable=True)
    from_location: Mapped[Optional[str]]
    to_location: Mapped[Optional[str]]
    notes: Mapped[Optional[str]]
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)

    asset: Mapped[Asset] = relationship(back_populates="events")

    __table_args__ = (
        Index("ix_asset_events_action", "action"),
        CheckConstraint(
            "(from_status IS NOT NULL AND to_status IS NOT NULL) OR action != 'status_changed'",
            name="chk_status_change_values",
        ),
        CheckConstraint(
            "(from_location IS NOT NULL AND to_location IS NOT NULL) OR action != 'location_changed'",
            name="chk_location_change_values",
        ),
    )
