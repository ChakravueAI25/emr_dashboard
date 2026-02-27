# Copilot Instructions — EMR Dashboard

This project is a full-stack EMR dashboard (React + Vite frontend, FastAPI backend, MongoDB). The notes below highlight the essential, discoverable patterns that help an AI coding agent be immediately productive.

## Big picture
- Frontend: Vite + React (see `src/main.tsx`, `src/App.tsx`). App uses local component state and `immer`/`produce` for deep updates and uses a centralized `API_ENDPOINTS` file (`src/config/api.ts`) for all backend URLs.
- Backend: FastAPI app rooted at `backend/main.py` and started with `backend/run_server.py` (runs `uvicorn "main:app"`). Database connections and collections are defined in `backend/database.py` (MongoDB via `pymongo`).
- Data flow: frontend calls REST endpoints (API_BASE_URL from `VITE_API_BASE_URL`) -> FastAPI routes in `backend/main.py` and `backend/saas_endpoints.py` -> read/write to MongoDB collections (`patients`, `users`, `pharmacy_medicines`, etc.). Patient identity key: `registrationId` (see patient endpoints and analytics handlers).

## Key workflows / commands
- Frontend dev: `npm run dev` (uses `vite`), build: `npm run build` (check `package.json`).
- Backend run (dev): `python backend/run_server.py` or `uvicorn main:app --reload` from the `backend` folder.
- Install Python deps: use `backend/requirements.txt` with a virtualenv: `python -m venv .venv && .venv\Scripts\pip install -r backend/requirements.txt`.

## Important environment variables
- `MONGO_URI` or `MONGO_URI_LOCAL` and `DATABASE_NAME` — configured and read in `backend/database.py`.
- `VITE_API_BASE_URL` — frontend API base (defaults to `http://127.0.0.1:8000`) used in `src/config/api.ts`.
- `AI_SERVICE_BASE`, `EVAL_API_URL`, `EVAL_API_KEY`, `EVAL_THRESHOLDS` — backend external AI/evaluation integrations (see `backend/main.py` evaluate/proxy logic).

## Project-specific patterns & conventions
- Two patient schemas are supported in code: new `encounters[]` structure and older `visits[]` structure. Handlers (e.g., `patient_iop_trend` in `backend/main.py`) implement safe fallbacks — prefer adding compatible code rather than assuming one schema.
- State updates on the frontend use a path-array mutation helper (`updateActivePatientData`) which expects a path like `['optometry','vision','unaided','rightEye']` and will coerce missing containers. Use this pattern when creating form handlers to avoid bypassing the producer.
- Centralized API endpoints: add new endpoints to `src/config/api.ts` and to the FastAPI app; frontend components import `API_ENDPOINTS` rather than hardcoding URLs.
- Authentication: users and roles live in `backend/user_collection`; authorization is role-based via `ALLOWED_ROLES` in `backend/models.py` (search for `ALLOWED_ROLES`).

## Integration points & external dependencies
- MongoDB (local or Atlas). `database.py` uses `certifi` for Atlas TLS; ensure `MONGO_URI` includes `mongodb.net` when using Atlas.
- Optional RAG/agent components referenced in `backend/requirements.txt` (e.g., `chromadb`, `sentence-transformers`) are commented as optional — they require native builds and are not installed by default.
- AI proxying: `AI_SERVICE_BASE` used by `proxy_request()` in `backend/main.py`. When adding model-backed endpoints, follow proxy pattern to keep service URL configurable.

## Where to add code & tests
- Backend endpoints: add routers to `backend/main.py` or create separate routers and `include_router()` them in `backend/main.py` to avoid growing a single file (see `saas_endpoints.py`).
- Database migrations / ad-hoc scripts live in `backend/` (e.g., `migrate_appointments.py`, `fix_duplicates.py`); run these as scripts with the backend venv.
- Tests / quick checks: there are small Python scripts like `test_visits.py` and `check_encounters.py` — inspect them for data-shape expectations before changing schemas.

## Quick examples (copyable)
- Start frontend (dev):
```bash
npm run dev
```
- Start backend (dev):
```bash
# from project root
python backend/run_server.py
# or from backend/
uvicorn main:app --reload --port 8000
```
- Call patient IOP trend (example): GET `/api/analytics/patient/<registrationId>/iop-trend` — implemented in `backend/main.py` with explicit fallback from `encounters` → `visits`.

## Notes for AI code agents
- Prefer small, targeted edits: add new API routes as separate routers and `include_router()` them in `backend/main.py` to avoid a large single-file merge conflict.
- When modifying patient data shape, update both backend read/write logic and frontend mapping helpers (search for `mapHistoryToPatientData` in `src/App.tsx`).
- Use `API_ENDPOINTS` for URL lookups; do not hardcode the host. Update `VITE_API_BASE_URL` in environment for local testing.
- Preserve defensive parsing patterns (e.g., numeric parsing in `evaluate_reading`) — this project prefers pragmatic, fault-tolerant code over strict validation in many places.

---
If you want, I can (1) merge more detailed file-level examples into this file, (2) add a small checklist for adding new API routes, or (3) run a quick scan for TODO/TODO-FIXME comments and surface priorities. What would you like next?
