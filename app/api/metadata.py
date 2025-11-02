from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from .dependencies import get_db

router = APIRouter()


@router.get("/organisation-units", response_model=list[schemas.OrganisationUnitRead])
def list_organisation_units(db: Session = Depends(get_db)):
    results = db.execute(select(models.OrganisationUnit).order_by(models.OrganisationUnit.name))
    return results.scalars().all()


@router.post(
    "/organisation-units", response_model=schemas.OrganisationUnitRead, status_code=status.HTTP_201_CREATED
)
def create_organisation_unit(
    payload: schemas.OrganisationUnitCreate, db: Session = Depends(get_db)
):
    unit = models.OrganisationUnit(**payload.model_dump())
    db.add(unit)
    db.flush()
    db.refresh(unit)
    return unit


@router.patch("/organisation-units/{unit_id}", response_model=schemas.OrganisationUnitRead)
def update_organisation_unit(
    unit_id: str, payload: schemas.OrganisationUnitUpdate, db: Session = Depends(get_db)
):
    unit = db.get(models.OrganisationUnit, unit_id)
    if not unit:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organisation unit not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(unit, field, value)
    db.flush()
    db.refresh(unit)
    return unit


@router.delete("/organisation-units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_organisation_unit(unit_id: str, db: Session = Depends(get_db)):
    unit = db.get(models.OrganisationUnit, unit_id)
    if not unit:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organisation unit not found")
    db.delete(unit)
    return None


@router.get("/asset-types", response_model=list[schemas.AssetTypeRead])
def list_asset_types(db: Session = Depends(get_db)):
    results = db.execute(select(models.AssetType).order_by(models.AssetType.name))
    return results.scalars().all()


@router.post("/asset-types", response_model=schemas.AssetTypeRead, status_code=status.HTTP_201_CREATED)
def create_asset_type(payload: schemas.AssetTypeCreate, db: Session = Depends(get_db)):
    asset_type = models.AssetType(**payload.model_dump())
    db.add(asset_type)
    db.flush()
    db.refresh(asset_type)
    return asset_type


@router.patch("/asset-types/{type_id}", response_model=schemas.AssetTypeRead)
def update_asset_type(type_id: str, payload: schemas.AssetTypeUpdate, db: Session = Depends(get_db)):
    asset_type = db.get(models.AssetType, type_id)
    if not asset_type:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset type not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(asset_type, field, value)

    db.flush()
    db.refresh(asset_type)
    return asset_type


@router.delete("/asset-types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset_type(type_id: str, db: Session = Depends(get_db)):
    asset_type = db.get(models.AssetType, type_id)
    if not asset_type:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset type not found")

    db.delete(asset_type)
    return None


@router.get("/asset-models", response_model=list[schemas.AssetModelRead])
def list_asset_models(db: Session = Depends(get_db)):
    results = db.execute(select(models.AssetModel).order_by(models.AssetModel.model_number))
    return results.scalars().all()


@router.post("/asset-models", response_model=schemas.AssetModelRead, status_code=status.HTTP_201_CREATED)
def create_asset_model(payload: schemas.AssetModelCreate, db: Session = Depends(get_db)):
    asset_model = models.AssetModel(**payload.model_dump())
    db.add(asset_model)
    db.flush()
    db.refresh(asset_model)
    return asset_model


@router.patch("/asset-models/{model_id}", response_model=schemas.AssetModelRead)
def update_asset_model(model_id: str, payload: schemas.AssetModelUpdate, db: Session = Depends(get_db)):
    asset_model = db.get(models.AssetModel, model_id)
    if not asset_model:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset model not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(asset_model, field, value)

    db.flush()
    db.refresh(asset_model)
    return asset_model


@router.delete("/asset-models/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_asset_model(model_id: str, db: Session = Depends(get_db)):
    asset_model = db.get(models.AssetModel, model_id)
    if not asset_model:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Asset model not found")

    db.delete(asset_model)
    return None
