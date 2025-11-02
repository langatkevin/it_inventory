# IT Inventory System Design

## Overview
The system modernises the existing Excel-based asset registers into a unified inventory platform with a FastAPI backend and a React/Vite frontend. It centralises data for servers, end-user devices, network hardware, spares, and archived assets inside a relational SQLite database, and exposes REST APIs for lifecycle automation and reporting.

## Domain Model
- **OrganisationUnit**: Departments, stores, or archive locations (`id`, `name`, `category` e.g. `department`, `warehouse`, `archive`).
- **Person**: Employees or contractors (`id`, `full_name`, `username`, `email`, `company`, `reports_to_id`).
- **AssetType**: Normalised asset taxonomy (`id`, `name`, `kind` such as `server`, `computer`, `monitor`, `network`, `peripheral`).
- **AssetModel**: Vendor/models linked to types (`id`, `manufacturer`, `model_number`, `asset_type_id`, `default_description`).
- **Asset**: Physical items tracked by the inventory (`id`, `asset_tag`, `serial_number`, `asset_model_id`, `status`, `operation_state`, `purchase_date`, `supplier`, `description`, `location_id`).
- **Assignment**: Current owner context (`asset_id`, `person_id`, `start_date`, `expected_return_date`, `primary_device` flag).
- **AssetRelationship**: Links between assets (e.g. workstation to monitors) with directional `relation_type`.
- **AssetEvent**: Immutable audit log for transitions (status changes, location moves, assignment updates) capturing `from_status`, `to_status`, `initiated_by`, and `notes`.

### Status Lifecycle
Assets move through canonical statuses:
- `active` – asset is deployed and in service.
- `spare` – asset is available in storage.
- `repair` – asset under maintenance.
- `retired` – asset archived / disposed.

These statuses replace the Excel sheet segregation (e.g. “Computers” vs “Store Spare Computers”) and power automation flows.

## Automation Flows
1. **Return Device**: Triggered when a user leaves or returns hardware. The backend:
   - closes the active assignment (`Assignment.end_date`).
   - logs an `AssetEvent`.
   - updates `Asset.status` to `spare` and moves the asset to a storage `OrganisationUnit`.
2. **Deploy Device**: Moves asset from spare/repair to active.
3. **Archive Asset**: Sets status to `retired`, records event, optionally records disposal info.
4. **Attach Peripherals**: binds monitors to computers via `AssetRelationship`.

Automation endpoints accept concise payloads (asset id, action, target user/location). The backend enforces valid transitions and records them in `AssetEvent`.

## API Surface
- `GET /api/assets` – paginated list with filters (status, type, department, user).
- `POST /api/assets` – create new asset.
- `PATCH /api/assets/{id}` – update mutable fields.
- `POST /api/assets/{id}/transition` – perform lifecycle state changes (deploy, return, repair, retire).
- `POST /api/assets/{id}/assignment` – assign to person with optional monitors/peripherals.
- `GET /api/assets/{id}/events` – timeline of changes.
- `GET /api/dashboard` – aggregates for dashboard cards and charts.
- CRUD endpoints for persons, asset types, models, and organisation units.

Authentication scaffolding is left minimal (not requested) but hooks are provided for future integration.

## Frontend Outline
- Built with React + TypeScript + Vite, styled with Tailwind CSS.
- Pages:
  - **Dashboard**: Summary cards (assets in service, spares, repairs, retired), quick actions, charts for distribution by department and type.
  - **Assets**: Data grid with search/filter, action drawer for transitions, inline status badges.
  - **People**: View personnel and assigned devices.
  - **Events Audit**: Chronological log with filters.
- Re-usable modals for actions (`DeployAssetModal`, `ReturnAssetModal`, `ArchiveAssetModal`).
- API service layer (`frontend/src/api/client.ts`) handles REST calls.

## Stack & Tooling
- **Backend**: FastAPI, SQLAlchemy 2, Pydantic, Uvicorn, SQLite (default), pytest.
- **Frontend**: React 18, TypeScript, Vite, Tailwind, React Query, React Router.
- **Shared utils**: date formatting, status metadata.

## Deployment
- `docker-compose.yml` orchestrates FastAPI backend, SQLite volume, and frontend container (served via Vite preview or nginx).
- `.env` file configures database connection (SQLite by default, Postgres ready).

## Next Steps
1. Implement SQLAlchemy models and Pydantic schemas.
2. Create migration/seed script to import existing Excel data (optional extra).
3. Build REST endpoints and lifecycle automation service.
4. Develop React frontend aligning with API.
5. Add tests for transitions and dashboards.
