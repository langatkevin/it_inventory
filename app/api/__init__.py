"""API router package."""

from fastapi import APIRouter

from . import assets, dashboard, metadata, people

api_router = APIRouter()

api_router.include_router(metadata.router, prefix="/metadata", tags=["metadata"])
api_router.include_router(people.router, prefix="/people", tags=["people"])
api_router.include_router(assets.router, prefix="/assets", tags=["assets"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

__all__ = ["api_router"]
