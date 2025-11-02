from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..services import TransitionService
from .dependencies import get_db

router = APIRouter()


@router.get("", response_model=list[schemas.PersonRead])
def list_people(db: Session = Depends(get_db)):
    results = db.execute(select(models.Person).order_by(models.Person.full_name))
    return results.scalars().all()


@router.post("", response_model=schemas.PersonRead, status_code=status.HTTP_201_CREATED)
def create_person(payload: schemas.PersonCreate, db: Session = Depends(get_db)):
    person = models.Person(**payload.model_dump())
    db.add(person)
    db.flush()
    db.refresh(person)
    return person


@router.get("/{person_id}", response_model=schemas.PersonRead)
def get_person(person_id: str, db: Session = Depends(get_db)):
    person = db.get(models.Person, person_id)
    if not person:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
    return person


@router.patch("/{person_id}", response_model=schemas.PersonRead)
def update_person(
    person_id: str,
    payload: schemas.PersonUpdate,
    db: Session = Depends(get_db),
):
    person = db.get(models.Person, person_id)
    if not person:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(person, field, value)

    db.flush()
    db.refresh(person)
    return person


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: str, db: Session = Depends(get_db)):
    person = db.get(models.Person, person_id)
    if not person:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")
    db.delete(person)
    return None


@router.get("/{person_id}/assignments", response_model=list[schemas.AssignmentWithAsset])
def list_person_assignments(person_id: str, db: Session = Depends(get_db)):
    person = db.get(models.Person, person_id)
    if not person:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")

    query = (
        select(models.Assignment)
        .options(
            joinedload(models.Assignment.asset).joinedload(models.Asset.asset_model),
            joinedload(models.Assignment.person),
        )
        .where(models.Assignment.person_id == person_id)
        .order_by(models.Assignment.start_date.desc())
    )
    results = db.execute(query)
    return results.scalars().all()


@router.post(
    "/{person_id}/offboard",
    response_model=schemas.PersonOffboardingResult,
    status_code=status.HTTP_200_OK,
)
def offboard_person(
    person_id: str,
    payload: schemas.PersonOffboardingRequest,
    db: Session = Depends(get_db),
):
    person = db.get(models.Person, person_id)
    if not person:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Person not found")

    asset_query = (
        select(models.Asset)
        .join(models.Assignment)
        .where(models.Assignment.person_id == person_id, models.Assignment.end_date.is_(None))
        .options(
            joinedload(models.Asset.assignments),
            joinedload(models.Asset.asset_model),
            joinedload(models.Asset.location),
            joinedload(models.Asset.relationships).joinedload(models.AssetRelationship.child),
        )
        .order_by(models.Asset.asset_tag, models.Asset.serial_number)
    )
    assets = db.execute(asset_query).unique().scalars().all()

    if not assets:
        return schemas.PersonOffboardingResult(processed_assets=[])

    override_map = {override.asset_id: override for override in payload.overrides}
    unknown_overrides = set(override_map.keys()) - {asset.id for asset in assets}
    if unknown_overrides:
        missing = ", ".join(sorted(unknown_overrides))
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Asset override references asset(s) not assigned to this person: {missing}",
        )

    service = TransitionService(db=db)
    processed_ids: list[str] = []

    for asset in assets:
        override = override_map.get(asset.id)
        disposition = override.disposition if override else payload.disposition
        target_location_id = (override.target_location_id if override else None) or payload.target_location_id
        combined_notes = "\n".join(
            note for note in [payload.notes, override.notes if override else None] if note
        ) or None

        if disposition == schemas.OffboardDisposition.spare:
            action = "return"
        elif disposition == schemas.OffboardDisposition.repair:
            action = "repair"
        else:
            action = "retire"

        request = schemas.AssetTransitionRequest(
            action=action,
            target_location_id=target_location_id,
            notes=combined_notes,
        )
        service.run(asset, request)
        processed_ids.append(asset.id)

    refreshed_assets = (
        db.execute(
            select(models.Asset)
            .where(models.Asset.id.in_(processed_ids))
            .options(
                joinedload(models.Asset.asset_model),
                joinedload(models.Asset.location),
                joinedload(models.Asset.assignments).joinedload(models.Assignment.person),
                joinedload(models.Asset.relationships).joinedload(models.AssetRelationship.child),
            )
        )
        .unique()
        .scalars()
        .all()
    )

    return schemas.PersonOffboardingResult(processed_assets=refreshed_assets)
