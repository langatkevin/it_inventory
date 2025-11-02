from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
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
