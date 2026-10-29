import os
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")

# Render uses postgres://, replace with postgresql:// for SQLAlchemy
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Default to Docker postgres if not specified
if not DATABASE_URL:
    DATABASE_URL = "postgresql+psycopg2://postgres:postgres@db:5432/teamtask_db"

engine = None

if "postgresql" in DATABASE_URL:
    # Attempt connection with retries in case postgres container is still initializing
    max_retries = 3
    for attempt in range(max_retries):
        try:
            temp_engine = create_engine(DATABASE_URL, pool_pre_ping=True)
            with temp_engine.connect():
                pass
            engine = temp_engine
            break
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1)
            else:
                print(f"PostgreSQL connection failed ({e}). Falling back to local SQLite database.")

if engine is None:
    DATABASE_URL = "sqlite:///./teamtask.db"
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
