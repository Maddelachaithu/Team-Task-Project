# TeamTask Enterprise 🚀

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](https://www.docker.com)
[![Pytest](https://img.shields.io/badge/Tests-Pytest%20100%25-brightgreen.svg?logo=pytest&logoColor=white)](https://pytest.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Enterprise-grade, containerized Work Item & Project Hub** featuring strict Role-Based Access Control (RBAC), real-time sprint velocity analytics, dynamic status workflows, and interactive API documentation.

---

## 📋 Table of Contents
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Live Local Endpoints](#-live-local-endpoints)
- [Quick Start Guide](#-quick-start-guide)
- [Demo Credentials](#-demo-credentials)
- [Role-Based Access Control (RBAC) Matrix](#-role-based-access-control-rbac-matrix)
- [API Reference](#-api-reference)
- [Database & Migrations](#-database--migrations)
- [Automated Testing](#-automated-testing)
- [Project Structure](#-project-structure)
- [License](#-license)

---

## ✨ Key Features

* **Interactive Executive Dashboard**: Real-time aggregate metric counters for Total, Open, In Progress, Completed, and Overdue work items.
* **Sprint Velocity & Completion Bar**: Dynamic progress tracking formula calculating real-time completion percentage with milestone states.
* **Strict Role-Based Access Control (RBAC)**: Fine-grained permissions isolating administrative features from operational members.
* **Real-time Lifecycle Transitions**: In-table status transitions (`To Do` $\rightarrow$ `In Progress` $\rightarrow$ `Done`) with optimistic UI feedback and live metric recalculation.
* **Color-Coded Priority Architecture**: Standardized visual indicators for Low, Medium, and High priority work items.
* **Instant Filtering & Search**: One-click status filter pills, priority selectors, and multi-field keyword search with reset controls.
* **100% Containerized Runtime**: Multi-service Docker Compose topology with persistent volumes and healthchecks.
* **Database Migrations via Alembic**: Automated versioned schema management with rollback support.

---

## 🏛 System Architecture

```text
                               ┌────────────────────────────────┐
                               │       Client Web Browser       │
                               └──────────────┬─────────────────┘
                                              │ HTTP (Port 3000)
                                              ▼
                               ┌────────────────────────────────┐
                               │   React 18 + Vite (Frontend)   │
                               └──────────────┬─────────────────┘
                                              │ REST API / JWT (Port 8000)
                                              ▼
                               ┌────────────────────────────────┐
                               │     FastAPI Server (Backend)   │
                               │  - OAuth2 Password Bearer Auth │
                               │  - Pydantic Validation & RBAC  │
                               │  - SQLAlchemy 2.0 ORM Engine   │
                               └──────────────┬─────────────────┘
                                              │ PostgreSQL Wire (Port 5432)
                                              ▼
                               ┌────────────────────────────────┐
                               │   PostgreSQL 15 (teamtask_db)  │
                               │   Persistent Docker Volume     │
                               └────────────────────────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Axios, Modern Scoped CSS / Design System |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic v2, Passlib (bcrypt), python-jose (JWT) |
| **Database & ORM** | PostgreSQL 15, SQLAlchemy 2.0, Psycopg2-binary, Alembic |
| **Testing** | Pytest, FastAPI TestClient, Starlette, SQLite Memory Fixtures |
| **DevOps** | Docker, Docker Compose, Multi-stage Container Builds |

---

## 🌐 Live Local Endpoints

Once running, the following endpoints are accessible locally:

| Service | Host URL | Description |
| :--- | :--- | :--- |
| **Frontend Application** | [http://localhost:3000](http://localhost:3000) | Full React single-page dashboard & login |
| **Backend API Root** | [http://localhost:8000](http://localhost:8000) | Auto-redirects to interactive Swagger docs |
| **Interactive API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Complete OpenAPI interactive documentation |
| **Alternative API Docs (ReDoc)** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Clean API reference specification |
| **Backend Health Check** | [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health) | Returns `{"status": "healthy"}` |
| **PostgreSQL Database** | `localhost:5432` | Primary relational database |

---

## 🚀 Quick Start Guide

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows, macOS, or Linux)
* [Git](https://git-scm.com/)

### 1. Clone the Repository
```bash
git clone https://github.com/Maddelachaithu/Team-Task-Project.git
cd Team-Task-Project
```

### 2. Environment Configuration
Copy the template environment file:
```bash
cp .env.example .env
```
*(Default credentials are pre-configured for instant local development)*

### 3. Build & Launch Containers
Launch the database, backend, and frontend with a single command:
```bash
docker compose up -d --build
```

### 4. Verify Service Health
```bash
docker compose ps
```
All containers (`teamtask_db`, `teamtask_backend`, `teamtask_frontend`) should report healthy/running status.

---

## 🔑 Demo Credentials

The platform comes pre-seeded with three demo profiles across all authorization tiers:

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@teamtask.local` | `AdminPass123!` | Full privileges: Create, view, update status, modify, and delete tasks. |
| **Manager** | `manager@teamtask.local` | `ManagerPass123!` | Management privileges: Create, view, update status, modify, and delete tasks. |
| **Member** | `member@teamtask.local` | `MemberPass123!` | Standard operational privileges: View dashboard and update task status. |

*(The login page includes 1-click credential autofill chips for fast testing)*

---

## 🛡 Role-Based Access Control (RBAC) Matrix

| Resource / Action | Admin | Manager | Member |
| :--- | :---: | :---: | :---: |
| **View Dashboard & Tasks (`GET /tasks`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Create Work Items (`POST /tasks`)** | ✅ Allowed | ✅ Allowed | ❌ 403 Forbidden |
| **Update Task Status (`PATCH /tasks/{id}`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Delete Work Items (`DELETE /tasks/{id}`)** | ✅ Allowed | ✅ Allowed | ❌ 403 Forbidden |
| **View Metric Summary (`GET /dashboard/summary`)**| ✅ Allowed | ✅ Allowed | ✅ Allowed |

---

## 📡 API Reference

All application endpoints are prefixed with `/api/v1`.

### Authentication
* `POST /api/v1/auth/login` — Authenticate via OAuth2 form data and receive a stateless JWT Bearer token.
* `GET /api/v1/auth/me` — Retrieve the authenticated profile (`id`, `name`, `email`, `role`).

### Work Items & Tasks
* `GET /api/v1/tasks` — List tasks with query parameters (`status`, `priority`, `search`, `skip`, `limit`).
* `POST /api/v1/tasks` — Create a new work item *(Admin/Manager only)*.
* `GET /api/v1/tasks/{id}` — Retrieve task details by ID.
* `PATCH /api/v1/tasks/{id}` — Update task attributes (Status, Priority, Description, Title).
* `DELETE /api/v1/tasks/{id}` — Remove a work item *(Admin/Manager only)*.

### Dashboard & Analytics
* `GET /api/v1/dashboard/summary` — Returns real-time task count aggregates:
  ```json
  {
    "total_tasks": 12,
    "open_tasks": 4,
    "in_progress_tasks": 3,
    "completed_tasks": 5,
    "overdue_tasks": 1
  }
  ```

---

## 🗄 Database & Migrations

Database schema versioning is managed with **Alembic**.

### Check Migration Revision Status
```bash
docker compose exec backend alembic current
```

### Apply Pending Migrations
```bash
docker compose exec backend alembic upgrade head
```

### Seed Demo Accounts & Sample Tasks
```bash
docker compose exec backend python seed.py
```

---

## 🧪 Automated Testing

A comprehensive test suite verifies core security, auth flows, and RBAC enforcement using in-memory SQLite isolation:

```bash
docker compose exec backend pytest
```

### Test Coverage Highlights:
* ✅ **Health Check**: `/api/v1/health` connectivity.
* ✅ **Authentication**: Valid login token issuance and invalid password rejection (`401 Unauthorized`).
* ✅ **RBAC Enforcement**: Verifies members are blocked (`403 Forbidden`) from creating or deleting work items.
* ✅ **Data Aggregation**: Verifies summary calculation logic and status counters.

---

## 📁 Project Structure

```text
teamtask/
├── .env.example                  # Environment configuration template
├── .gitignore                    # Git tracking rules
├── docker-compose.yml            # Multi-service container orchestration
├── README.md                     # Project documentation & reference
│
├── backend/
│   ├── Dockerfile                # Python 3.11 slim backend image
│   ├── requirements.txt          # Python runtime dependencies
│   ├── alembic.ini               # Alembic configuration
│   ├── alembic/                  # Database migration scripts & environment
│   ├── seed.py                   # Initial database demo seed script
│   ├── tests/
│   │   └── test_main.py          # Pytest automated test suite
│   └── app/
│       ├── main.py               # FastAPI entry point & CORS configuration
│       ├── api/routes/           # Route handlers (auth, tasks, dashboard)
│       ├── core/                 # JWT security & password hashing
│       ├── db/                   # SQLAlchemy engine & session management
│       ├── dependencies/         # Auth & user resolution dependencies
│       ├── models/               # SQLAlchemy ORM entities (User, Task)
│       └── schemas/              # Pydantic validation models
│
├── frontend/
│   ├── Dockerfile                # Node 20 alpine frontend image
│   ├── package.json              # NPM dependencies & scripts
│   ├── vite.config.ts            # Vite bundler configuration
│   ├── index.html                # Single-page application template
│   └── src/
│       ├── main.tsx              # React entry point
│       └── App.tsx               # Enterprise Dashboard & Work Item UI
│
└── docs/
    ├── technical-documentation.md# Deep technical architectural breakdown
    └── presentation.md           # 13-Slide project defense presentation
```

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
