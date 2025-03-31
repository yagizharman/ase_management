from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List

class User(BaseModel):
    UserId: Optional[int]
    FullName: str
    Username: str
    Password: str
    Email: EmailStr
    Role: str
    Team: Optional[str]

class Task(BaseModel):
    TaskId: Optional[int]
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
