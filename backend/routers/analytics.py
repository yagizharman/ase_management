from fastapi import APIRouter, Depends
from database import get_db
from datetime import datetime

router = APIRouter()

@router.get("/user-task-distribution")
def user_task_distribution(userId: int, startDate: datetime, endDate: datetime, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT Priority, ValueSize, DueDate, COUNT(*) as TaskCount
        FROM Tasks
        WHERE AssignedToUserId=? AND StartDate BETWEEN ? AND ?
        GROUP BY Priority, ValueSize, DueDate
    """, userId, startDate, endDate)
    distribution = cursor.fetchall()
    return [dict(zip([column[0] for column in cursor.description], row)) for row in distribution]

@router.get("/performance")
def team_performance(teamId: str, startDate: datetime, endDate: datetime, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT AssignedToUserId, SUM(PlannedHours) AS TotalPlanned, SUM(SpentHours) AS TotalSpent
        FROM Tasks
        WHERE Team=? AND StartDate BETWEEN ? AND ?
        GROUP BY AssignedToUserId
    """, teamId, startDate, endDate)
    performance = cursor.fetchall()
    return [dict(zip([column[0] for column in cursor.description], row)) for row in performance]
