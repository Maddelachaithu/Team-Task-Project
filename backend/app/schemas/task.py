from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from app.models.entities import TaskStatus, TaskPriority, UserRole

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole

    model_config = ConfigDict(from_attributes=True)

class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    assignee_id: Optional[int] = None

class TaskResponse(TaskBase):
    id: int
    status: TaskStatus
    creator_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
