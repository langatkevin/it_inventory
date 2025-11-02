# IT Inventory Platform

This project replaces the multi-sheet Excel tracker with a full-stack IT inventory application. It provides a FastAPI backend with lifecycle automation and a React + Vite frontend for interactive management of servers, computers, spares, network devices, and archived hardware.

## Features
- Unified asset model with statuses (`active`, `spare`, `repair`, `retired`) replacing separate spreadsheets.
- Transition automation endpoints to deploy, return, move, repair, or retire assets; peripherals (monitors) can follow the primary device automatically.
- Audit trail of asset events and assignment history.
- Dashboard summarising totals, status counts, and distributions by type and department.
- Asset workspace with filtering, search, pagination, and quick actions.
- People view showing each employee and their historical device assignments.

## Backend (FastAPI + SQLite)

### Setup
1. Create and activate a virtual environment (optional but recommended).
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the API:
   ```bash
   uvicorn app.main:app --reload
   ```
4. Open the interactive docs at `http://localhost:8000/docs`.

By default the service uses a local SQLite database file `inventory.db`. Adjust `DATABASE_URL` in `.env` to target Postgres or another RDBMS.

### Key Endpoints
- `GET /api/assets` – paginated assets with filters.
- `POST /api/assets/{id}/transition` – automate moves (deploy/return/repair/retire/move).
- `GET /api/dashboard/summary` – data for dashboard widgets.
- `GET /api/people/{id}/assignments` – assignment history for a person.

## Frontend (React + Vite + Tailwind)

### Setup
1. Move into the frontend directory: `cd frontend`
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the UI at `http://localhost:5173`.

The Vite proxy forwards `/api` calls to `http://localhost:8000` by default. Change `VITE_API_BASE` in `.env` or adjust `vite.config.ts` if the backend lives elsewhere.

## Data Migration Ideas
- Use `pandas` to read the existing Excel workbook and insert rows via SQLAlchemy models.
- Map each Excel sheet to the unified status+type combination (e.g. "Store Spare Computers" ? `status=spare`, `asset_type=computer`).
- Record monitor relationships by linking monitor rows to their computers through `AssetRelationship` entries.

## Testing
- `python -m compileall app` ensures the backend modules import cleanly.
- Add pytest suites under `tests/` to cover transitions and service logic (e.g. return flow closing assignments, peripheral handling).

## Next Steps
- Secure the API with authentication/authorization.
- Add Excel import script and scheduled inventory verification.
- Extend dashboard with trend lines (e.g., assets deployed per month).
- Integrate notifications on overdue returns.
