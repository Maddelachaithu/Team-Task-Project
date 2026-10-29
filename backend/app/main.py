from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.db.session import engine, Base
from app.api.routes import auth, tasks, dashboard
from app.db.init_db import seed_demo_users

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-initialize database schema and seed demo accounts on startup
    try:
        Base.metadata.create_all(bind=engine)
        seed_demo_users()
    except Exception as e:
        print(f"Startup DB init warning: {e}")
    yield

app = FastAPI(title="TeamTask API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
