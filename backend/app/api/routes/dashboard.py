from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db
from app.models.entities import Task, TaskStatus
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_summary(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    total = db.query(Task).count()
    open_tasks = db.query(Task).filter(Task.status == TaskStatus.TODO).count()
    in_progress = db.query(Task).filter(Task.status == TaskStatus.IN_PROGRESS).count()
    completed = db.query(Task).filter(Task.status == TaskStatus.DONE).count()
    overdue = db.query(Task).filter(Task.due_date < datetime.utcnow(), Task.status != TaskStatus.DONE).count()
    return {
        "total_tasks": total,
        "open_tasks": open_tasks,
        "in_progress_tasks": in_progress,
        "completed_tasks": completed,
        "overdue_tasks": overdue
    }
