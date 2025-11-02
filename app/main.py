from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import api_router
from .config import get_settings
from .db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialise application resources."""

    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        openapi_url=f"{settings.api_prefix}/openapi.json",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.api_prefix)

    @app.get("/")
    def root():
        return {"message": "IT Inventory API is running"}

    return app


app = create_app()
