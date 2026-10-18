# FivPay - Enterprise Full-Stack Fintech Platform

FivPay is a multi-role, double-entry digital banking and corporate expense management platform engineered with a decoupled frontend, Flask REST API backend, normalized relational database schema (MySQL & SQLite fallback), and vector SVG iconography.

---

## 1. System Architecture

```
FivPay/
├── frontend/                     # Client application (Port 4000)
│   ├── index.html                # Master SPA (User Dashboard, Staff Workspace, Admin Console)
│   ├── auth.html                 # Authentication Portal (Login, Registration, 1-Click Personas)
│   ├── css/
│   │   ├── style.css             # Design tokens (Midnight Navy, Warm Off-White, Tabular Nums)
│   │   ├── components.css        # Cards, authentic virtual cards, receipts, scanner HUD, modals
│   │   └── dashboard.css         # Sidebar shell, top bar, responsive layouts
│   └── js/
│       ├── api.js                # Centralized REST API client (http://localhost:5000/api)
│       ├── icons.js              # Crisp 20x20 inline SVG vector icons (No emojis)
│       ├── app.js                # Master controller, RBAC routing, modals, toast alerts
│       ├── auth.js               # JWT session synchronization and role switcher
│       ├── payments.js           # Idempotent transfer flow & 2-step verification
│       ├── qr-engine.js          # Native FivPay QR & standard UPI QR parser
│       ├── charts.js             # High-DPI vanilla HTML5 Canvas charts
│       └── mock-data.js          # Local state persistence for sandbox mode
├── backend/                      # Python Flask Core API (Port 5000)
│   ├── app/
│   │   ├── __init__.py           # Flask application factory, CORS, blueprints & auto-seeding
│   │   ├── config.py             # Environment configuration (MySQL / SQLite / JWT)
│   │   ├── middleware/
│   │   │   └── auth.py           # JWT token encoder/decoder & @role_required RBAC
│   │   ├── models/
│   │   │   └── models.py         # SQLAlchemy models (DECIMAL(18,2) monetary fields)
│   │   ├── routes/
│   │   │   ├── auth_routes.py    # /api/auth (register, login, me, logout)
│   │   │   ├── transaction_routes.py # /api/transactions (atomic double-entry transfers)
│   │   │   ├── expense_routes.py # /api/expenses (staff submissions, admin approvals)
│   │   │   ├── admin_routes.py   # /api/admin (user management, status toggles, metrics)
│   │   │   ├── budget_routes.py  # /api/budgets (monthly spending caps)
│   │   │   └── qr_routes.py      # /api/qr (generation, UPI parsing, gateway status)
│   │   ├── services/
│   │   │   ├── payment_provider.py # Payment Gateway Adapter (Sandbox / Live rails)
│   │   │   └── qr_service.py     # Multi-rail QR encoder & UPI format validator
│   │   └── database/
│   │       ├── schema.sql        # MySQL 8.0+ production DDL with foreign keys & indexes
│   │       └── seed.sql          # Sandbox seed dataset
│   ├── tests/                    # Pytest test suite (14/14 tests passing)
│   │   ├── conftest.py           # In-memory test database and client fixtures
│   │   ├── test_auth.py          # Authentication & token tests
│   │   ├── test_transactions.py  # Atomic double-entry & idempotency tests
│   │   ├── test_expenses.py      # Staff expense claims & admin approvals
│   │   └── test_security.py      # RBAC barrier enforcement & QR parsing tests
│   ├── run.py                    # Production / Development entry point (:5000)
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Environment variable template
├── run_fivpay.bat                # 1-click Windows starter script
└── backup_v1/                    # Preserved initial frontend backup
```

---

## 2. Quick Start on Windows

### Prerequisites
- Python 3.10+ (Verified with Python 3.14.5)
- (Optional) MySQL 8.0+ service running locally. If MySQL credentials are not yet set in `.env`, the system automatically falls back to the embedded local SQLite database so development is never blocked.

### Step 1: Install Python Dependencies
Open PowerShell or Command Prompt:
```powershell
python -m pip install -r backend/requirements.txt
```

### Step 2: Start the Backend API (Port 5000)
In Terminal 1:
```powershell
python backend/run.py
```
*The REST API will be available at `http://localhost:5000`.*  
*Health Check: `http://localhost:5000/api/health`.*

### Step 3: Start the Frontend (Port 4000)
In Terminal 2:
```powershell
python -m http.server 4000 --directory frontend
```
*Open your browser to: `http://localhost:4000`.*

---

## 3. Database Setup (MySQL 8.0+)

1. Log into your local MySQL command line:
   ```sql
   CREATE DATABASE fivpay CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   USE fivpay;
   SOURCE backend/app/database/schema.sql;
   SOURCE backend/app/database/seed.sql;
   ```
2. Copy `backend/.env.example` to `backend/.env` and update your MySQL password:
   ```ini
   MYSQL_HOST=localhost
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=your_actual_mysql_password
   MYSQL_DB=fivpay
   ```
3. Restart `backend/run.py`. The backend will automatically bind to MySQL!

---

## 4. Running the Test Suite

Execute the complete pytest suite:
```powershell
python -m pytest backend/tests -v
```
**Results:** `14 passed in ~2.9s` verifying authentication, double-entry atomic transactions, idempotency collision prevention, staff expense reviews, and RBAC security boundaries.

---

## 5. Demo Accounts

| Role | Email | Password | Assigned Permissions |
|---|---|---|---|
| **User** | `alex.mercer@fivpay.com` | `demo1234` | Personal balances, send transfers, generate personal QR, budgets |
| **Staff** | `sarah.compliance@fivpay.com` | `demo1234` | Corporate expense claim submission, receipt viewing |
| **Admin** | `marcus.admin@fivpay.com` | `demo1234` | Platform user management, expense review/approval, audit logs, metrics |
