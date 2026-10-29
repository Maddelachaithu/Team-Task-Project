from app.db.init_db import seed_demo_users

if __name__ == "__main__":
    seed_demo_users()
    print("Database seeded with Admin, Manager, and Member demo accounts!")
