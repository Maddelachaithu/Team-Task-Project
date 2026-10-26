import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import Base, get_db
from app.models.entities import User, UserRole
from app.core.security import hash_password

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Pre-seed test users
    admin = User(name="Admin", email="admin@test.com", password_hash=hash_password("Pass123!"), role=UserRole.ADMIN)
    manager = User(name="Manager", email="manager@test.com", password_hash=hash_password("Pass123!"), role=UserRole.MANAGER)
    member = User(name="Member", email="member@test.com", password_hash=hash_password("Pass123!"), role=UserRole.MEMBER)
    
    db.add_all([admin, manager, member])
    db.commit()
    
    yield db
    
    db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

def get_token(client, email, password="Pass123!"):
    res = client.post("/api/v1/auth/login", data={"username": email, "password": password})
    return res.json().get("access_token")

# --- Tests ---

def test_health_check(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}

def test_login_success_and_failure(client, db_session):
    # Valid login
    res = client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "Pass123!"})
    assert res.status_code == 200
    assert "access_token" in res.json()

    # Invalid password
    res_fail = client.post("/api/v1/auth/login", data={"username": "admin@test.com", "password": "WrongPassword"})
    assert res_fail.status_code == 401

def test_task_crud_and_rbac(client, db_session):
    manager_token = get_token(client, "manager@test.com")
    member_token = get_token(client, "member@test.com")
    
    headers_manager = {"Authorization": f"Bearer {manager_token}"}
    headers_member = {"Authorization": f"Bearer {member_token}"}

    # 1. Member cannot create a task (RBAC check)
    res_member_create = client.post("/api/v1/tasks", json={"title": "Unauthorized"}, headers=headers_member)
    assert res_member_create.status_code == 403

    # 2. Manager creates a task (201 Created)
    res_create = client.post("/api/v1/tasks", json={"title": "Test Task", "priority": "High"}, headers=headers_manager)
    assert res_create.status_code == 201
    task_id = res_create.json()["id"]
    assert res_create.json()["title"] == "Test Task"

    # 3. Read task details (200 OK)
    res_get = client.get(f"/api/v1/tasks/{task_id}", headers=headers_member)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == task_id

    # 4. Update task status (200 OK)
    res_update = client.patch(f"/api/v1/tasks/{task_id}", json={"status": "In Progress"}, headers=headers_member)
    assert res_update.status_code == 200
    assert res_update.json()["status"] == "In Progress"

    # 5. Member cannot delete task (403 Forbidden)
    res_del_member = client.delete(f"/api/v1/tasks/{task_id}", headers=headers_member)
    assert res_del_member.status_code == 403

    # 6. Manager deletes task (204 No Content)
    res_del_manager = client.delete(f"/api/v1/tasks/{task_id}", headers=headers_manager)
    assert res_del_manager.status_code == 204

def test_dashboard_summary(client, db_session):
    manager_token = get_token(client, "manager@test.com")
    headers = {"Authorization": f"Bearer {manager_token}"}

    client.post("/api/v1/tasks", json={"title": "Task 1", "priority": "Low"}, headers=headers)
    client.post("/api/v1/tasks", json={"title": "Task 2", "priority": "Medium"}, headers=headers)

    res = client.get("/api/v1/dashboard/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["total_tasks"] == 2
    assert data["open_tasks"] == 2
    assert data["completed_tasks"] == 0
