from app.db.session import SessionLocal, engine, Base
from app.models.entities import User, UserRole, Task, TaskStatus, TaskPriority
from app.core.security import hash_password

def seed_demo_users(db_session=None):
    """
    Idempotent initialization of default tables and demo accounts.
    Runs on startup so demo credentials work immediately in any environment.
    """
    Base.metadata.create_all(bind=engine)
    should_close = False
    if db_session is None:
        db = SessionLocal()
        should_close = True
    else:
        db = db_session

    try:
        users = [
            {"name": "Admin User", "email": "admin@teamtask.local", "password": "AdminPass123!", "role": UserRole.ADMIN},
            {"name": "Manager User", "email": "manager@teamtask.local", "password": "ManagerPass123!", "role": UserRole.MANAGER},
            {"name": "Member User", "email": "member@teamtask.local", "password": "MemberPass123!", "role": UserRole.MEMBER},
        ]
        user_records = {}
        for u in users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                new_user = User(
                    name=u["name"],
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"]
                )
                db.add(new_user)
                db.flush()
                user_records[u["role"]] = new_user
            else:
                # Always update the password hash and role to guarantee demo credentials work
                existing.password_hash = hash_password(u["password"])
                existing.role = u["role"]
                existing.name = u["name"]
                db.add(existing)
                db.flush()
                user_records[u["role"]] = existing

        # Seed initial sample tasks if empty
        if db.query(Task).count() == 0:
            admin_user = user_records.get(UserRole.ADMIN) or db.query(User).filter(User.role == UserRole.ADMIN).first()
            if admin_user:
                sample_tasks = [
                    Task(
                        title="Design System & UI Components",
                        description="Implement cohesive color tokens, status badges, and typography across portals.",
                        status=TaskStatus.DONE,
                        priority=TaskPriority.HIGH,
                        creator_id=admin_user.id
                    ),
                    Task(
                        title="Database Migration & Schema Alignment",
                        description="Execute Alembic migrations and verify foreign key constraints on task models.",
                        status=TaskStatus.IN_PROGRESS,
                        priority=TaskPriority.HIGH,
                        creator_id=admin_user.id
                    ),
                    Task(
                        title="Sprint Velocity Analytics",
                        description="Implement real-time KPI card aggregation and sprint completion percentage.",
                        status=TaskStatus.TODO,
                        priority=TaskPriority.MEDIUM,
                        creator_id=admin_user.id
                    ),
                ]
                db.add_all(sample_tasks)

        db.commit()
    except Exception as e:
        print(f"Seed demo users warning: {e}")
        db.rollback()
    finally:
        if should_close:
            db.close()
