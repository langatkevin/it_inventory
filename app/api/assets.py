from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..services import TransitionService
from .dependencies import get_db

router = APIRouter()


@router.get("", response_model=schemas.AssetListResponse)
def list_assets(
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=200),
    status_filter: Optional[models.AssetStatus] = Query(None, alias="status"),
    asset_type_id: Optional[str] = None,
    location_id: Optional[str] = None,
    person_id: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = select(models.Asset).options(
        joinedload(models.Asset.asset_model),
        joinedload(models.Asset.location),
        joinedload(models.Asset.assignments).joinedload(models.Assignment.person),
        joinedload(models.Asset.relationships).joinedload(models.AssetRelationship.child),
    )

    count_query = select(func.count(func.distinct(models.Asset.id))).select_from(models.Asset)

    if status_filter:
        query = query.where(models.Asset.status == status_filter)
        count_query = count_query.where(models.Asset.status == status_filter)

    if asset_type_id:
        query = query.join(models.Asset.asset_model)
        count_query = count_query.join(models.Asset.asset_model)
        query = query.where(models.AssetModel.asset_type_id == asset_type_id)
        count_query = count_query.where(models.AssetModel.asset_type_id == asset_type_id)

    if location_id:
        query = query.where(models.Asset.location_id == location_id)
        count_query = count_query.where(models.Asset.location_id == location_id)

    if person_id:
        query = query.join(models.Asset.assignments)
        count_query = count_query.join(models.Asset.assignments)
        query = query.where(
            models.Assignment.person_id == person_id, models.Assignment.end_date.is_(None)
        )
        count_query = count_query.where(
            models.Assignment.person_id == person_id, models.Assignment.end_date.is_(None)
        )

    if search:
        like_value = f"%{search.lower()}%"
        query = query.where(
            func.lower(models.Asset.asset_tag).like(like_value)
            | func.lower(models.Asset.serial_number).like(like_value)
            | func.lower(models.Asset.description).like(like_value)
        )
        count_query = count_query.where(
            func.lower(models.Asset.asset_tag).like(like_value)
            | func.lower(models.Asset.serial_number).like(like_value)
            | func.lower(models.Asset.description).like(like_value)
        )

    total = db.execute(count_query).scalar_one()
    items = (
        db.execute(
            query.order_by(models.Asset.asset_tag, models.Asset.serial_number)
            .offset((page - 1) * size)
            .limit(size)
        )
        .unique()
        .scalars()
        .all()
    )

    return schemas.AssetListResponse(
        items=items,
        total=total,
        page=page,
        size=size,
    )


@router.post("", response_model=schemas.AssetRead, status_code=status.HTTP_201_CREATED)
def create_asset(payload: schemas.AssetCreate, db: Session = Depends(get_db)):
    asset = models.Asset(**payload.model_dump())
    db.add(asset)
    db.flush()
    db.add(
        models.AssetEvent(
            asset_id=asset.id,
            action=models.EventAction.created,
            actor=None,
            notes="Asset created via API",
        )
    )
    db.flush()
    db.refresh(asset)
    return asset


@router.get("/{asset_id}", response_model=schemas.AssetRead)
def get_asset(asset_id: str, db: Session = Depends(get_db)):
    asset = (
        db.execute(
            select(models.Asset)
            .where(models.Asset.id == asset_id)
            .options(
                joinedload(models.Asset.asset_model),
                joinedload(models.Asset.location),
                joinedload(models.Asset.assignments).joinedload(models.Assignment.person),
                joinedload(models.Asset.relationships).joinedload(models.AssetRelationship.child),
            )
        )
        .scalars()
        .first()
    )
    if not asset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    return asset


@router.patch("/{asset_id}", response_model=schemas.AssetRead)
def update_asset(
    asset_id: str,
    payload: schemas.AssetUpdate,
    db: Session = Depends(get_db),
):
    asset = db.get(models.Asset, asset_id)
    if not asset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)

    db.flush()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset(asset_id: str, db: Session = Depends(get_db)):
    asset = db.get(models.Asset, asset_id)
    if not asset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")
    db.delete(asset)
    return None


@router.post("/{asset_id}/transition", response_model=schemas.AssetRead)
def transition_asset(
    asset_id: str,
    payload: schemas.AssetTransitionRequest,
    db: Session = Depends(get_db),
):
    asset = (
        db.execute(
            select(models.Asset)
            .where(models.Asset.id == asset_id)
            .options(
                joinedload(models.Asset.assignments),
                joinedload(models.Asset.relationships).joinedload(models.AssetRelationship.child),
            )
        )
        .scalars()
        .first()
    )
    if not asset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")

    service = TransitionService(db=db)
    asset = service.run(asset, payload)

    db.refresh(asset)
    return asset


@router.get("/{asset_id}/events", response_model=list[schemas.AssetEventRead])
def list_asset_events(asset_id: str, db: Session = Depends(get_db)):
    asset = db.get(models.Asset, asset_id)
    if not asset:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset not found")

    events = (
        db.execute(
            select(models.AssetEvent)
            .where(models.AssetEvent.asset_id == asset_id)
            .order_by(models.AssetEvent.created_at.desc())
        )
        .scalars()
        .all()
    )
    return events
