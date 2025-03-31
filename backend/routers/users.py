from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from schemas import User, UserResponse
from typing import List

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def get_users(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT UserId, FullName, Username, Email, Role, Team FROM Users")
    users = cursor.fetchall()
    return [dict(zip([column[0] for column in cursor.description], row)) for row in users]

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db=Depends(get_db)):
    try:
        cursor = db.cursor()
        cursor.execute("""
            SELECT UserId, FullName, Username, Email, Role, Team 
            FROM Users 
            WHERE UserId=?
        """, (user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        columns = ["UserId", "FullName", "Username", "Email", "Role", "Team"]
        return dict(zip(columns, user))
    except Exception as e:
        print(f"Error fetching user: {str(e)}")  # Debug log
        raise HTTPException(status_code=500, detail="Internal server error while fetching user")

@router.get("/{user_id}/tasks")
def get_user_tasks(user_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Tasks WHERE AssignedToUserId=?", user_id)
    tasks = cursor.fetchall()
    return [dict(zip([column[0] for column in cursor.description], task)) for task in tasks]
