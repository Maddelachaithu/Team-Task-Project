import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.session import engine, Base
from app.api.routes import auth, tasks, dashboard

# Retry DB creation in case Postgres takes an extra second
for _ in range(10):
    try:
        Base.metadata.create_all(bind=engine)
        break
    except Exception as e:
        time.sleep(2)

app = FastAPI(title="TeamTask API", version="1.0.0")

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

from fastapi.responses import RedirectResponse

@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse(url="/docs")

@app.get("/api/v1/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}

