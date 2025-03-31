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

class TaskUpdate(BaseModel):
    Title: str
    Description: Optional[str] = None
    Priority: Optional[str] = None
    Team: Optional[str] = None
    StartDate: Optional[datetime] = None
    DueDate: Optional[datetime] = None
    AssignedToUserId: Optional[int] = None
    PlannedHours: Optional[float] = None
    SpentHours: Optional[float] = None
    ValueSize: Optional[int] = None
    Status: Optional[str] = None
    RoadMap: Optional[str] = None

class TaskPartnerBase(BaseModel):
    UserId: int
    PlannedHours: float
    SpentHours: float = 0
    RoadMap: str

class TaskPartnerCreate(TaskPartnerBase):
    pass

class TaskPartner(TaskPartnerBase):
    TaskPartnerId: int
    TaskId: int

class TaskWithPartners(Task):
    Partners: List[TaskPartner] = []
