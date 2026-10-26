# TeamTask Enterprise Project Hub - Technical Documentation

## 1. System Overview
TeamTask is a containerized, full-stack work item and lifecycle management system. The platform enforces strict Role-Based Access Control (RBAC), aggregates real-time task metrics via high-efficiency database queries, and provides an enterprise-tier web interface.

## 2. Architecture & Tech Stack
- **Frontend**: React 18 with TypeScript, Axios HTTP client, and modern CSS layout systems.
- **Backend API**: FastAPI (Python 3.11), asynchronous execution pipelines, Pydantic data sanitization.
- **Data Layer**: PostgreSQL 16 relational database with SQLAlchemy 2.0 ORM and Alembic schema migrations.
- **Security & Auth**: OAuth2 password bearer flow with stateless JWT authentication and bcrypt password hashing.
- **Containerization**: Multi-service Docker Compose orchestration with persistent data volumes.

## 3. Database Schema
### `users` Table
- `id` (Integer, Primary Key, Indexed)
- `email` (String, Unique, Indexed)
- `hashed_password` (String)
- `name` (String)
- `role` (Enum: `admin`, `manager`, `member`)
- `created_at` (DateTime, UTC)

### `tasks` Table
- `id` (Integer, Primary Key, Indexed)
- `title` (String, Indexed)
- `description` (Text, Nullable)
- `status` (Enum: `To Do`, `In Progress`, `Done`, Indexed)
- `priority` (Enum: `Low`, `Medium`, `High`, Indexed)
- `due_date` (DateTime, Nullable)
- `created_by` (Integer, ForeignKey to `users.id`)
- `assigned_to` (Integer, Nullable, ForeignKey to `users.id`)
- `created_at` (DateTime, UTC)

## 4. Role-Based Access Control (RBAC) Matrix
| Resource / Action | Admin | Manager | Member |
|---|---|---|---|
| View Tasks & Dashboard | Allowed | Allowed | Allowed |
| Create Work Items | Allowed | Allowed | Denied (403 Forbidden) |
| Update Task Status | Allowed | Allowed | Allowed |
| Modify Priority/Details | Allowed | Allowed | Denied (403 Forbidden) |
| Delete Work Items | Allowed | Allowed | Denied (403 Forbidden) |

## 5. Verification & Testing
The system contains an automated pytest test suite (`backend/tests/test_main.py`) verifying:
- `/api/v1/health` endpoint response.
- JWT issue and invalid credential rejection.
- RBAC policy enforcement across routes.
- Aggregate calculation logic for the dashboard summary.
