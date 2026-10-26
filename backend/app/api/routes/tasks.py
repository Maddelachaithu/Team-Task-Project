from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.models.entities import Task, User, TaskStatus, TaskPriority, UserRole
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from app.dependencies.auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("", response_model=List[TaskResponse])
def get_tasks(
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Task)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if search:
        query = query.filter(Task.title.ilike(f"%{search}%"))
    return query.offset(skip).limit(limit).all()

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task_in: TaskCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Members cannot create tasks")
    task = Task(**task_in.model_dump(), creator_id=current_user.id)
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/{id}", response_model=TaskResponse)
def get_task(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.patch("/{id}", response_model=TaskResponse)
def update_task(id: int, task_in: TaskUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in task_in.model_dump(exclude_unset=True).items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role == UserRole.MEMBER:
        raise HTTPException(status_code=403, detail="Members cannot delete tasks")
    task = db.query(Task).filter(Task.id == id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return None
