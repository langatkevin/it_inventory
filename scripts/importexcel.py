from __future__ import annotations

import argparse
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd
from sqlalchemy.orm import Session

from app.db import SessionLocal, init_db
from app.models import (
    Asset,
    AssetEvent,
    AssetModel,
    AssetStatus,
    AssetType,
    OrganisationCategory,
    OrganisationUnit,
    OperationState,
    Person,
    Assignment,
    RelationType,
    AssetRelationship,
    EventAction,
)

STATUS_MAP = {
    "active": AssetStatus.active,
    "in use": AssetStatus.active,
    "spare": AssetStatus.spare,
    "store spare": AssetStatus.spare,
    "repair": AssetStatus.repair,
    "retired": AssetStatus.retired,
    "archive": AssetStatus.retired,
}

TYPE_ALIASES = {
    "servers": "Server",
    "computers": "Computer",
    "network devices": "Network Device",
    "store spare computers": "Computer",
    "store spare monitor": "Monitor",
    "archive": None,  # take what row provides
}

def normalise_status(raw: Optional[str], *, default: AssetStatus) -> AssetStatus:
    if not raw:
        return default
    return STATUS_MAP.get(raw.strip().lower(), default)

def get_or_create(session: Session, model, defaults=None, **filters):
    instance = session.query(model).filter_by(**filters).one_or_none()
    if instance:
        return instance
    data = {**filters}
    if defaults:
        data.update(defaults)
    instance = model(**data)
    session.add(instance)
    session.flush()
    return instance

def upsert_asset_model(session: Session, type_name: str, model_name: str) -> AssetModel:
    asset_type = get_or_create(
        session,
        AssetType,
        name=type_name,
        defaults={"category": type_name, "description": None},
    )
    return get_or_create(
        session,
        AssetModel,
        model_number=model_name,
        defaults={
            "manufacturer": None,
            "asset_type_id": asset_type.id,
            "default_description": model_name,
        },
    )

def upsert_department(session: Session, name: Optional[str], *, category: OrganisationCategory) -> Optional[OrganisationUnit]:
    if not name:
        return None
    return get_or_create(
        session,
        OrganisationUnit,
        name=name.strip(),
        defaults={"category": category, "description": None},
    )

def upsert_person(session: Session, full_name: Optional[str], username: Optional[str], company: Optional[str], department: Optional[OrganisationUnit], reports_to_name: Optional[str]) -> Optional[Person]:
    if not full_name and not username:
        return None
    filters = {}
    if username:
        filters["username"] = username.strip()
    if not filters:
        filters["full_name"] = full_name.strip()
    person = session.query(Person).filter_by(**filters).one_or_none()
    if not person:
        person = Person(
            full_name=full_name or username or "Unknown",
            username=username.strip() if username else None,
            company=company,
        )
        session.add(person)
        session.flush()
    if department and person.department_id != department.id:
        person.department_id = department.id
    if reports_to_name:
        manager = upsert_person(session, reports_to_name, None, None, None, None)
        if manager:
            person.reports_to_id = manager.id
    return person

def add_event(session: Session, asset: Asset, notes: str) -> None:
    event = AssetEvent(
        asset_id=asset.id,
        action=EventAction.created,
        notes=notes,
    )
    session.add(event)

def _find_asset(session: Session, asset_tag: Optional[str], serial_number: Optional[str]) -> Optional[Asset]:
    if asset_tag:
        asset = session.query(Asset).filter(Asset.asset_tag == asset_tag.strip()).one_or_none()
        if asset:
            return asset
    if serial_number:
        asset = session.query(Asset).filter(Asset.serial_number == serial_number.strip()).one_or_none()
        if asset:
            return asset
    return None

def _ensure_assignment(
    session: Session,
    asset: Asset,
    person: Person,
    *,
    primary_device: bool,
    notes: Optional[str] = None,
) -> None:
    existing_assignment = (
        session.query(Assignment)
        .filter(Assignment.asset_id == asset.id, Assignment.end_date.is_(None))
        .one_or_none()
    )
    if existing_assignment:
        if existing_assignment.person_id == person.id:
            return
        existing_assignment.end_date = datetime.utcnow()
    assignment = Assignment(
        asset_id=asset.id,
        person_id=person.id,
        start_date=datetime.utcnow(),
        primary_device=primary_device,
        notes=notes,
    )
    session.add(assignment)

def ingest_servers(session: Session, df: pd.DataFrame) -> None:
    for _, row in df.iterrows():
        if row.isna().all():
            continue
        department = upsert_department(session, row.get("Department"), category=OrganisationCategory.department)
        asset = _create_asset(
            session,
            "Server",
            row,
            default_status=AssetStatus.active,
            default_location=department,
            description_fields=["Description"],
        )
        purchase_date = (
            pd.to_datetime(row.get("Date of Purchase"), errors="coerce").date()
            if row.get("Date of Purchase")
            else None
        )
        if purchase_date:
            asset.purchase_date = purchase_date
        if row.get("Supplier"):
            asset.supplier = row.get("Supplier")

def _create_asset(session: Session, type_name: str, row: dict, *, default_status: AssetStatus, default_location: Optional[OrganisationUnit], description_fields: list[str]) -> Asset:
    model_name = str(row.get("Asset model") or type_name)
    model = upsert_asset_model(session, type_name, model_name)
    description = row.get("Description")
    if not description:
        description = " | ".join(str(row.get(field)) for field in description_fields if row.get(field))
    status = normalise_status(row.get("Operation"), default=default_status)
    location = default_location
    if not location and status == AssetStatus.active:
        location = upsert_department(
            session,
            "Unassigned Pool",
            category=OrganisationCategory.warehouse,
        )
    asset_tag = row.get("Asset name")
    serial_number = row.get("Serial Number")
    asset = _find_asset(session, asset_tag, serial_number)
    created = False
    if not asset:
        asset = Asset(
            asset_model_id=model.id,
            asset_tag=asset_tag,
            serial_number=serial_number,
            status=status,
            operation_state=OperationState.normal,
            supplier=row.get("Supplier"),
            description=description,
            location_id=location.id if location else None,
        )
        session.add(asset)
        session.flush()
        created = True
    else:
        asset.asset_model_id = model.id
        if asset_tag and asset.asset_tag != asset_tag:
            asset.asset_tag = asset_tag
        if serial_number and asset.serial_number != serial_number:
            asset.serial_number = serial_number
        asset.status = status
        asset.operation_state = OperationState.normal
        if row.get("Supplier"):
            asset.supplier = row.get("Supplier")
        if description:
            asset.description = description
        if location and asset.location_id != location.id:
            asset.location_id = location.id
    if created:
        add_event(session, asset, f"Imported {type_name}")
    return asset

def _attach_monitor(session: Session, computer: Asset, monitor_tag: Optional[str], person: Optional[Person]) -> None:
    if not monitor_tag or str(monitor_tag).strip() == "":
        return
    monitor = _find_asset(session, monitor_tag.strip(), None)
    if not monitor:
        model = upsert_asset_model(session, "Monitor", "Generic Monitor")
        monitor = Asset(
            asset_model_id=model.id,
            asset_tag=monitor_tag.strip(),
            status=AssetStatus.active,
            operation_state=OperationState.normal,
            location_id=computer.location_id,
        )
        session.add(monitor)
        session.flush()
        add_event(session, monitor, "Created while linking monitor to computer")
    else:
        # keep monitor aligned with the computer once it's linked
        if computer.location_id and monitor.location_id != computer.location_id:
            monitor.location_id = computer.location_id
        if monitor.status != AssetStatus.active:
            monitor.status = AssetStatus.active
    if person:
        _ensure_assignment(
            session,
            monitor,
            person,
            primary_device=False,
            notes=f"Imported with {computer.asset_tag or 'computer'}",
        )
    existing_relation = (
        session.query(AssetRelationship)
        .filter(
            AssetRelationship.parent_asset_id == computer.id,
            AssetRelationship.child_asset_id == monitor.id,
            AssetRelationship.relation_type == RelationType.peripheral_of,
        )
        .one_or_none()
    )
    if not existing_relation:
        relation = AssetRelationship(
            parent_asset_id=computer.id,
            child_asset_id=monitor.id,
            relation_type=RelationType.peripheral_of,
        )
        session.add(relation)

def ingest_computers(session: Session, df: pd.DataFrame, *, default_status: AssetStatus) -> None:
    for _, row in df.iterrows():
        if row.isna().all():
            continue
        department = upsert_department(session, row.get("Department"), category=OrganisationCategory.department)
        location = upsert_department(session, row.get("LOCATION") or row.get("Location"), category=OrganisationCategory.warehouse)
        person = upsert_person(
            session,
            full_name=row.get("Assigned User"),
            username=row.get("Username"),
            company=row.get("Company"),
            department=department,
            reports_to_name=row.get("Report To"),
        )
        asset = _create_asset(
            session,
            "Computer",
            row,
            default_status=default_status,
            default_location=location or department,
            description_fields=["Company", "Department"],
        )
        if person:
            asset.status = AssetStatus.active
            _ensure_assignment(
                session,
                asset,
                person,
                primary_device=True,
                notes="Imported from Computers sheet",
            )
        session.flush()
        for column in ("Monitor 1", "Monitor 2", "Monitor 3"):
            _attach_monitor(session, asset, row.get(column), person)

def ingest_network_devices(session: Session, df: pd.DataFrame) -> None:
    for _, row in df.iterrows():
        if row.isna().all():
            continue
        _create_asset(
            session,
            "Network Device",
            row,
            default_status=AssetStatus.active,
            default_location=None,
            description_fields=["Description"],
        )

def ingest_spares(session: Session, df: pd.DataFrame, *, type_name: str) -> None:
    for _, row in df.iterrows():
        if row.isna().all():
            continue
        location = upsert_department(session, row.get("Location"), category=OrganisationCategory.warehouse)
        _create_asset(
            session,
            type_name,
            row,
            default_status=AssetStatus.spare,
            default_location=location,
            description_fields=["Company", "Department"],
        )

def ingest_archive(session: Session, df: pd.DataFrame) -> None:
    archive_unit = upsert_department(session, "Archive", category=OrganisationCategory.archive)
    for _, row in df.iterrows():
        if row.isna().all():
            continue
        person = upsert_person(
            session,
            full_name=row.get("Assigned User"),
            username=row.get("Username"),
            company=None,
            department=None,
            reports_to_name=None,
        )
        asset = _create_asset(
            session,
            row.get("Type") or "Archived Asset",
            row,
            default_status=AssetStatus.retired,
            default_location=archive_unit,
            description_fields=["Asset name", "Location"],
        )
        if person:
            asset.notes = f"Last assigned to {person.full_name}"
        asset.status = AssetStatus.retired

INGESTORS = {
    "Servers": ingest_servers,
    "Computers": lambda session, df: ingest_computers(session, df, default_status=AssetStatus.active),
    "Network Devices": ingest_network_devices,
    "Store Spare Computers": lambda session, df: ingest_computers(session, df, default_status=AssetStatus.spare),
    "Store Spare Monitor": lambda session, df: ingest_spares(session, df, type_name="Monitor"),
    "Archive": ingest_archive,
}

def import_workbook(path: Path) -> None:
    init_db()
    with SessionLocal() as session:
        with session.begin():
            xls = pd.ExcelFile(path)
            for sheet_name, handler in INGESTORS.items():
                if sheet_name not in xls.sheet_names:
                    continue
                df = xls.parse(sheet_name).fillna("")
                handler(session, df)
        session.commit()

def main() -> None:
    parser = argparse.ArgumentParser(description="Import Excel workbook into the inventory database.")
    parser.add_argument("workbook", type=Path, help="Path to the Excel workbook")
    args = parser.parse_args()
    import_workbook(args.workbook)

if __name__ == "__main__":
    main()
