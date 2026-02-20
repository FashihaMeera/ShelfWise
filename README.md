# Shelfwise — Smart Library Management (Scaffold)

This workspace contains a minimal scaffold for a Smart Library Management System:

- `backend/` — FastAPI app with JWT-based auth and MongoDB (motor)
- `frontend/` — Vue 3 (Vite) skeleton with login UI

Run backend:

```powershell
Run locally (no Docker):
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Run frontend (after installing deps):

```powershell
1) Ensure MongoDB is running locally (default: `mongodb://localhost:27017`). You can:
	- Install MongoDB Community on Windows and start the service, or
	- Use a hosted MongoDB (Atlas) and set `MONGO_URI` accordingly.

2) Start the backend:

```powershell
cd "backend"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

3) Start the frontend:

```powershell
cd frontend
npm install
npm run dev
```
npm install
Environment:
- Copy `backend/.env.example` → `.env` and set `SECRET_KEY` before production.
- API base URL default is `http://localhost:8000` (override with `VUE_APP_API_URL`).
```
What's included (scaffold):
- JWT helpers in `backend/app/auth.py`
- CRUD helpers in `backend/app/crud.py`
- Basic register/login endpoints in `backend/app/main.py`
- Vue 3 skeleton in `frontend/src` with `Login.vue` and `Dashboard.vue`

Next steps: implement full RBAC, protected routes, role-specific dashboards, book/transaction models, and notification integrations.
What's included (scaffold):
- JWT helpers in `backend/app/auth.py`
- CRUD helpers in `backend/app/crud.py`
- Basic register/login endpoints in `backend/app/main.py`
- Vue 3 skeleton in `frontend/src` with `Login.vue` and `Dashboard.vue`

Next steps: implement full RBAC, protected routes, role-specific dashboards, book/transaction models, Docker, and notification integrations.
