from app.db.session import SessionLocal, engine, Base
from app.models.entities import User, UserRole
from app.core.security import hash_password

def seed_data():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    users = [
        {"name": "Admin User", "email": "admin@teamtask.local", "password": "AdminPass123!", "role": UserRole.ADMIN},
        {"name": "Manager User", "email": "manager@teamtask.local", "password": "ManagerPass123!", "role": UserRole.MANAGER},
        {"name": "Member User", "email": "member@teamtask.local", "password": "MemberPass123!", "role": UserRole.MEMBER},
    ]
    for u in users:
        if not db.query(User).filter(User.email == u["email"]).first():
            new_user = User(
                name=u["name"],
                email=u["email"],
                password_hash=hash_password(u["password"]),
                role=u["role"]
            )
            db.add(new_user)
    db.commit()
    db.close()
    print("Database seeded with Admin, Manager, and Member demo accounts!")

if __name__ == "__main__":
    seed_data()
