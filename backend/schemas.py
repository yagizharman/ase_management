from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, date
from typing import Optional, List

# --- Authentication ---
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenData(BaseModel):
    user_id: int
    username: str
    role: str
    team_id: Optional[int] = None # Team might not always be relevant or assigned initially
    exp: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# --- Teams ---
class TeamBase(BaseModel):
    name: str

class TeamCreate(TeamBase):
    manager_id: Optional[int] = None # Manager might be assigned later

class Team(TeamBase):
    id: int
    manager_id: Optional[int] = None

    class Config:
        orm_mode = True # or from_attributes = True for Pydantic v2

# --- Users ---
class UserBase(BaseModel):
    username: str = Field(..., max_length=50)
    email: EmailStr = Field(..., max_length=100)
    name: str = Field(..., max_length=100)
    role: str = Field(..., max_length=20) # 'employee' or 'manager'
    team_id: int # Assuming team is mandatory now

class UserCreate(UserBase):
    password: str

# Stored in DB (includes hash)
class UserInDB(UserBase):
    id: int
    password_hash: str

    class Config:
        orm_mode = True # or from_attributes = True

# Response model (omits password)
class UserResponse(UserBase):
    id: int

    class Config:
        orm_mode = True # or from_attributes = True

# For returning user info after login or for /me endpoint
class UserInfo(BaseModel):
    id: int
    username: str
    email: EmailStr
    name: str
    role: str
    team_id: int

# --- Task Assignees ---
class TaskAssigneeBase(BaseModel):
    user_id: int
    role: str = Field(..., max_length=20) # 'assignee', 'partner', 'notified'
    planned_labor: Optional[float] = None # Specific planned hours for this user on this task
    actual_labor: float = 0.0

class TaskAssigneeCreate(TaskAssigneeBase):
    pass # Inherits all fields

class TaskAssignee(TaskAssigneeBase):
    id: int
    task_id: int

    class Config:
        orm_mode = True # or from_attributes = True

# --- Tasks ---
class TaskBase(BaseModel):
    description: str = Field(..., max_length=255)
    priority: str = Field(..., max_length=20) # 'High', 'Medium', 'Low'
    team_id: int
    start_date: date
    completion_date: date # Renamed from DueDate
    planned_labor: float # Total planned hours for the task
    work_size: int = Field(..., ge=1, le=5) # Renamed from ValueSize
    roadmap: str # Renamed from RoadMap
    status: str = Field(..., max_length=20) # 'Not Started', 'In Progress', etc.

class TaskCreateData(BaseModel):
    """Data needed to create a task, including assignees"""
    description: str = Field(..., max_length=255)
    priority: str = Field(..., max_length=20)
    team_id: int # Team associated with the task
    start_date: date
    completion_date: date
    planned_labor: float
    work_size: int = Field(..., ge=1, le=5)
    roadmap: str
    status: str = Field(..., max_length=20)
    # Assignees, partners, notified users specified during creation
    assignees: List[TaskAssigneeCreate] = [] # Should contain at least one 'assignee' role usually

class Task(TaskBase):
    id: int
    creator_id: int
    actual_labor: float = 0.0 # Total actual hours

    class Config:
        orm_mode = True # or from_attributes = True

class TaskResponse(Task):
    """Task details including assignees/partners"""
    assignees: List[TaskAssignee] = []

class TaskUpdateData(BaseModel):
    """Data for updating a task"""
    description: Optional[str] = Field(None, max_length=255)
    priority: Optional[str] = Field(None, max_length=20)
    team_id: Optional[int] = None # Managers might change team?
    start_date: Optional[date] = None
    completion_date: Optional[date] = None
    planned_labor: Optional[float] = None
    work_size: Optional[int] = Field(None, ge=1, le=5)
    roadmap: Optional[str] = None
    status: Optional[str] = Field(None, max_length=20)
    # Allow updating assignees/partners/notified list? (complex - might need separate endpoints)
    assignees: Optional[List[TaskAssigneeCreate]] = None
    history_note: Optional[str] = None  # For recording the reason for the update in task history

# --- Task History ---
class TaskHistoryBase(BaseModel):
    task_id: int
    user_id: int
    action: str = Field(..., max_length=50)
    details: Optional[str] = None

class TaskHistoryCreate(TaskHistoryBase):
    pass

class TaskHistory(TaskHistoryBase):
    id: int
    timestamp: datetime

    class Config:
        orm_mode = True # or from_attributes = True


# --- Analytics ---
class UserTaskDistributionItem(BaseModel):
    # Adjust based on what analytics.py actually returns
    Priority: str # Keeping original case for compatibility if needed, but prefer snake_case
    ValueSize: int # Keeping original case
    DueDate: date # Keeping original case
    TaskCount: int

class TeamPerformanceItem(BaseModel):
    # Adjust based on what analytics.py actually returns
    UserId: int # Keeping original case
    TotalPlanned: Optional[float] = None # SUM can return NULL if no rows
    TotalSpent: Optional[float] = None # SUM can return NULL

# --- Teams (Additions) ---
class TeamBase(BaseModel):
    name: str = Field(..., max_length=100)

class TeamCreate(TeamBase):
    # Manager ID can be set during creation or later
    manager_id: Optional[int] = None

class TeamUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    manager_id: Optional[int] = None # Allows changing the manager

class Team(TeamBase):
    id: int
    manager_id: Optional[int] = None
    # Optional: Include manager details or list of users if needed frequently
    # manager: Optional[UserResponse] = None # Requires joining in the query
    # users: List[UserResponse] = []      # Requires joining in the query

    class Config:
        orm_mode = True # or from_attributes = True

# --- Users (Additions) ---
class UserUpdate(BaseModel):
    # Fields users might update for themselves or managers might update
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = Field(None, max_length=100)
    # Password change should ideally be a separate endpoint for security
    # team_id: Optional[int] = None # Changing team needs careful permission checks
    # role: Optional[str] = None    # Changing role needs careful permission checks

class PasswordUpdateRequest(BaseModel):
    current_password: str
    new_password: str


# --- Helper for Updates ---
# To easily handle partial updates with Pydantic models
def get_update_data(model: BaseModel) -> dict:
    return model.dict(exclude_unset=True)

# --- Notifications ---
class NotificationBase(BaseModel):
    recipient_email: EmailStr
    message: str
    is_read: bool = False
    