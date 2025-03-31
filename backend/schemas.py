from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class LoginRequest(BaseModel):
    username: str
    password: str

class User(BaseModel):
    UserId: Optional[int]
    FullName: str
    Username: str
    PasswordHash: str
    Email: EmailStr
    Role: str
    Team: Optional[str]

class UserResponse(BaseModel):
    UserId: int
    FullName: str
    Username: str
    Email: EmailStr
    Role: str
    Team: Optional[str]

class UserCreate(BaseModel):
    FullName: str
    Username: str
    Password: str
    Email: EmailStr
    Role: str
    Team: Optional[str]

class TaskBase(BaseModel):
    Title: str
    Description: Optional[str]
    Priority: str
    Team: Optional[str]
    StartDate: datetime
    DueDate: datetime
    CreatedByUserId: int
    AssignedToUserId: int
    PlannedHours: float
    SpentHours: Optional[float]
    ValueSize: int
    Status: str
    RoadMap: str

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    TaskId: int
