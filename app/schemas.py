from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from .models import (
    AssetStatus,
    EventAction,
    OperationState,
    OrganisationCategory,
    RelationType,
)


class OrganisationUnitBase(BaseModel):
    name: str
    category: OrganisationCategory
    description: Optional[str] = None


class OrganisationUnitCreate(OrganisationUnitBase):
    pass


class OrganisationUnitUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[OrganisationCategory] = None
    description: Optional[str] = None


class OrganisationUnitRead(OrganisationUnitBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class PersonBase(BaseModel):
    full_name: str
    username: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    department_id: Optional[str] = None
    reports_to_id: Optional[str] = None


class PersonCreate(PersonBase):
    pass


class PersonUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    department_id: Optional[str] = None
    reports_to_id: Optional[str] = None


class PersonRead(PersonBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class AssetTypeBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None


class AssetTypeCreate(AssetTypeBase):
    pass


class AssetTypeUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None


class AssetTypeRead(AssetTypeBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class AssetModelBase(BaseModel):
    manufacturer: Optional[str] = None
    model_number: str
    asset_type_id: str
    default_description: Optional[str] = None


class AssetModelCreate(AssetModelBase):
    pass


class AssetModelUpdate(BaseModel):
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    asset_type_id: Optional[str] = None
    default_description: Optional[str] = None


class AssetModelRead(AssetModelBase):
    id: str

    model_config = ConfigDict(from_attributes=True)


class AssignmentRead(BaseModel):
    id: str
    person: PersonRead
    start_date: datetime
    end_date: Optional[datetime] = None
    expected_return_date: Optional[datetime] = None
    primary_device: bool
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AssetBase(BaseModel):
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    asset_model_id: str
    status: AssetStatus = AssetStatus.spare
    operation_state: OperationState = OperationState.normal
    purchase_date: Optional[date] = None
    supplier: Optional[str] = None
    description: Optional[str] = None
    location_id: Optional[str] = None
    notes: Optional[str] = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    asset_model_id: Optional[str] = None
    status: Optional[AssetStatus] = None
    operation_state: Optional[OperationState] = None
    purchase_date: Optional[date] = None
    supplier: Optional[str] = None
    description: Optional[str] = None
    location_id: Optional[str] = None
    notes: Optional[str] = None


class AssetSummary(BaseModel):
    id: str
    asset_tag: Optional[str] = None
    serial_number: Optional[str] = None
    status: AssetStatus
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AssetRelationRead(BaseModel):
    id: str
    child_asset_id: str
    relation_type: RelationType
    child: Optional[AssetSummary] = None

    model_config = ConfigDict(from_attributes=True)


class AssetRead(BaseModel):
    id: str
    asset_tag: Optional[str]
    serial_number: Optional[str]
    status: AssetStatus
    operation_state: OperationState
    description: Optional[str]
    notes: Optional[str]
    purchase_date: Optional[date]
    supplier: Optional[str]
    asset_model: AssetModelRead
    location: Optional[OrganisationUnitRead]
    assignments: list[AssignmentRead] = Field(default_factory=list)
    relationships: list[AssetRelationRead] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AssetEventRead(BaseModel):
    id: str
    asset_id: str
    action: EventAction
    actor: Optional[str]
    from_status: Optional[AssetStatus]
    to_status: Optional[AssetStatus]
    from_location: Optional[str]
    to_location: Optional[str]
    notes: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AssetTransitionRequest(BaseModel):
    action: str = Field(
        description="Transition identifier: deploy, return, repair, retire, move"
    )
    target_status: Optional[AssetStatus] = None
    target_location_id: Optional[str] = None
    person_id: Optional[str] = None
    expected_return_date: Optional[datetime] = None
    notes: Optional[str] = None
    peripherals: list[str] = Field(
        default_factory=list, description="Peripheral asset IDs to attach during deploy"
    )


class AssignmentCreateRequest(BaseModel):
    person_id: str
    expected_return_date: Optional[datetime] = None
    primary_device: bool = True
    notes: Optional[str] = None
    monitors: list[str] = Field(default_factory=list, description="Monitor asset IDs to attach")


class AssignmentWithAsset(AssignmentRead):
    asset: AssetSummary

    model_config = ConfigDict(from_attributes=True)


class DashboardSummary(BaseModel):
    total_assets: int
    active_assets: int
    spare_assets: int
    repair_assets: int
    retired_assets: int
    assets_by_type: dict[str, int]
    assets_by_department: dict[str, int]


class AssetListResponse(BaseModel):
    items: list[AssetRead]
    total: int
    page: int
    size: int
