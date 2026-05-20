# PulseLedger Payroll Management System

PulseLedger is a full-stack payroll and attendance platform built in this workspace with:

- `client/`: Next.js 16 App Router + Tailwind CSS admin and self-service UI
- `backend/`: FastAPI + SQLAlchemy API and server-rendered attendance kiosk
- Face recognition via DeepFace using `ArcFace` and `RetinaFace`
- PDF payslips via WeasyPrint
- Excel exports via Pandas + openpyxl

## Folder structure

```text
.
├── backend
│   ├── app
│   │   ├── face
│   │   ├── models
│   │   ├── routers
│   │   ├── services
│   │   ├── static
│   │   ├── templates
│   │   ├── employees_faces
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── schemas.py
│   │   └── security.py
│   ├── init_db.py
│   └── requirements.txt
└── client
    ├── app
    │   ├── dashboard
    │   ├── employees
    │   ├── face-registration
    │   ├── login
    │   ├── payroll
    │   ├── payslips
    │   ├── reports
    │   ├── settings
    │   └── self-service
    ├── components
    ├── lib
    ├── proxy.ts
    └── package.json
```

## Backend setup

1. Create a Python virtual environment inside `backend/`.
2. Install dependencies:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

3. Start PostgreSQL:

```bash
docker compose up -d
```

4. Initialize the database and seed defaults:

```bash
python init_db.py
```

5. Run the API and kiosk server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Important backend endpoints:

- `POST /api/auth/login`
- `GET /api/employees`
- `POST /api/face/register`
- `GET /kiosk`
- `POST /kiosk/scan`

Default seeded admin credentials are read from `backend/.env`:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

Phase 2A changes:

- Employee onboarding now uses a temporary password that is stored only as a hash in `users`
- New employee accounts are flagged with `must_change_password`
- Compensation is tracked in `employee_compensation_history` with effective dates
- Approved payroll runs are locked and versioned
- Correction payroll runs can reference a locked source run

## Frontend setup

1. Install packages in `client/`:

```bash
cd client
npm install
```

2. Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

3. Start the Next.js frontend:

```bash
npm run dev
```

Open:

- Admin UI: `http://127.0.0.1:3000/login`
- Kiosk UI: `http://127.0.0.1:8000/kiosk`

## Face recognition notes

- Face registration is webcam-only in the Next.js app.
- The kiosk also uses webcam capture only.
- Browser capture is transported to FastAPI as an in-memory blob or multipart payload. There is no manual file picker anywhere in the UI.
- Employee face frames are stored under `backend/app/employees_faces/{employee_id}/`.

## Main modules delivered

- Employee CRUD with soft delete
- Temporary-password onboarding with forced password change
- Webcam-based face registration with 10 guided angles
- FastAPI/Jinja2 kiosk with animated scan UI
- Attendance check-in/check-out logging
- Payroll calculation from effective compensation history, draft runs, locked approvals, corrections, and PDF payslips
- Reports preview plus Excel/PDF export
- Settings management
- Employee self-service for profile, leave, attendance, and payslips

## Runtime caveats

- DeepFace, RetinaFace, and WeasyPrint require native/runtime dependencies on the machine. If those fail, install the missing system packages first.
- The backend imports DeepFace directly in the face service, so make sure the Python environment is complete before starting `uvicorn`.
