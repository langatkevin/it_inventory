from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from .dependencies import get_db

router = APIRouter()


@router.get("/summary", response_model=schemas.DashboardSummary)
def get_dashboard_summary(db: Session = Depends(get_db)):
    base = select(
        func.count(models.Asset.id),
        func.sum(case((models.Asset.status == models.AssetStatus.active, 1), else_=0)),
        func.sum(case((models.Asset.status == models.AssetStatus.spare, 1), else_=0)),
        func.sum(case((models.Asset.status == models.AssetStatus.repair, 1), else_=0)),
        func.sum(case((models.Asset.status == models.AssetStatus.retired, 1), else_=0)),
    )
    total, active, spare, repair, retired = db.execute(base).one()

    type_rows = db.execute(
        select(models.AssetType.name, func.count(models.Asset.id))
        .join(models.AssetModel, models.AssetModel.asset_type_id == models.AssetType.id)
        .join(models.Asset, models.Asset.asset_model_id == models.AssetModel.id)
        .group_by(models.AssetType.name)
        .order_by(models.AssetType.name)
    ).all()
    assets_by_type = {name: count for name, count in type_rows}

    department_rows = db.execute(
        select(models.OrganisationUnit.name, func.count(models.Asset.id))
        .join(
            models.Asset,
            models.Asset.location_id == models.OrganisationUnit.id,
        )
        .where(models.OrganisationUnit.category == models.OrganisationCategory.department)
        .group_by(models.OrganisationUnit.name)
        .order_by(models.OrganisationUnit.name)
    ).all()
    assets_by_department = {name: count for name, count in department_rows}

    return schemas.DashboardSummary(
        total_assets=int(total or 0),
        active_assets=int(active or 0),
        spare_assets=int(spare or 0),
        repair_assets=int(repair or 0),
        retired_assets=int(retired or 0),
        assets_by_type=assets_by_type,
        assets_by_department=assets_by_department,
    )
