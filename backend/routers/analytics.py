from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from database import get_db
from schemas import UserDetailedTaskDistribution, DailyTaskDistribution, TaskResponse
from typing import List
from routers.auth import get_current_user, UserInfo
from datetime import date, timedelta
import pyodbc
from pydantic import BaseModel

router = APIRouter()

# Add new request model for optimization parameters
class OptimizationRequest(BaseModel):
    team_id: int
    optimization_param: str = "priority"
    start_date: date
    end_date: date

# Yardımcı fonksiyon: Günlük işçilik dağılımı hesaplama
def calculate_daily_labor_distribution(tasks: List[dict], start_date: date, end_date: date):
    distribution = {}
    current_date = start_date
    while current_date <= end_date:
        distribution[current_date] = {
            "date": current_date,
            "planned_labor": 0,
            "actual_labor": 0,
            "remaining_labor": 0,
            "tasks": []
        }
        current_date += timedelta(days=1)

    for task in tasks:
        task_start = max(task["start_date"], start_date)
        task_end = min(task["completion_date"], end_date)
        total_days = (task_end - task_start).days + 1

        daily_planned = (task["planned_labor"] - task.get("actual_labor", 0)) / total_days if total_days > 0 else 0

        current_date = task_start
        while current_date <= task_end:
            if current_date in distribution:
                distribution[current_date]["planned_labor"] += daily_planned
                distribution[current_date]["actual_labor"] += task.get("actual_labor", 0) / total_days if total_days > 0 else 0
                distribution[current_date]["remaining_labor"] = distribution[current_date]["planned_labor"] - distribution[current_date]["actual_labor"]
                
                # Format task according to TaskResponse model
                formatted_task = {
                    "id": task["id"],
                    "description": task["description"],
                    "priority": task["priority"],
                    "team_id": task["team_id"],
                    "start_date": task["start_date"],
                    "completion_date": task["completion_date"],
                    "planned_labor": task["planned_labor"],
                    "actual_labor": task["actual_labor"],
                    "work_size": task["work_size"],
                    "roadmap": task["roadmap"],
                    "status": task["status"],
                    "creator_id": task["creator_id"],
                    "assignees": task["assignees"]  # Already formatted in the calling function
                }
                distribution[current_date]["tasks"].append(formatted_task)
            current_date += timedelta(days=1)

    return [DailyTaskDistribution(**day) for day in distribution.values()]

# Çalışan için detaylı görev dağılımı endpoint'i
@router.get("/user-detailed-distribution", response_model=UserDetailedTaskDistribution)
def get_user_detailed_distribution(
    user_id: int,
    start_date: date = Query(...),
    end_date: date = Query(...),
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    if user_id != current_user.id and current_user.role != 'manager':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yetkisiz erişim.")

    cursor = db.cursor()
    cursor.execute("""
        SELECT t.id, t.description, t.priority, t.team_id, t.start_date, t.completion_date, 
               t.planned_labor, t.actual_labor, t.work_size, t.roadmap, t.status, t.creator_id,
               ta.planned_labor as assignee_planned_labor, ta.actual_labor as assignee_actual_labor
        FROM tasks t
        JOIN task_assignees ta ON t.id = ta.task_id
        WHERE ta.user_id = ? AND t.start_date BETWEEN ? AND ?
    """, (user_id, start_date, end_date))

    tasks = [dict(zip([column[0] for column in cursor.description], row)) for row in cursor.fetchall()]

    # Process tasks to match TaskResponse format
    processed_tasks = []
    for task in tasks:
        processed_task = {
            "id": task["id"],
            "description": task["description"],
            "priority": task["priority"],
            "team_id": task["team_id"],
            "start_date": task["start_date"],
            "completion_date": task["completion_date"],
            "planned_labor": task["planned_labor"],
            "actual_labor": task["actual_labor"],
            "work_size": task["work_size"],
            "roadmap": task["roadmap"],
            "status": task["status"],
            "creator_id": task["creator_id"],
            "assignees": [{
                "id": task["id"],  # Using task id as assignee id since we don't have it
                "task_id": task["id"],
                "user_id": user_id,
                "role": "assignee",  # Default role since we don't have it in the query
                "planned_labor": task["assignee_planned_labor"],
                "actual_labor": task["assignee_actual_labor"]
            }]
        }
        processed_tasks.append(processed_task)

    daily_distribution = calculate_daily_labor_distribution(processed_tasks, start_date, end_date)

    cursor.execute("SELECT name FROM users WHERE id = ?", (user_id,))
    user_name = cursor.fetchone()[0]

    return UserDetailedTaskDistribution(
        user_id=user_id,
        user_name=user_name,
        daily_distribution=daily_distribution
    )

# Yönetici için optimize edilmiş görev dağılımı endpoint'i
@router.post("/optimize-task-distribution", response_model=List[UserDetailedTaskDistribution])
def optimize_task_distribution(
    request: OptimizationRequest,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    if current_user.role != 'manager' or current_user.team_id != request.team_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yetkisiz erişim.")

    cursor = db.cursor()

    ordering = {
        "priority": "CASE t.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END",
        "work_size": "t.work_size DESC",
        "completion_date": "t.completion_date"
    }

    cursor.execute(f"""
        SELECT u.id as user_id, u.name as user_name, 
               t.id, t.description, t.priority, t.team_id, t.start_date, t.completion_date,
               t.planned_labor, t.actual_labor, t.work_size, t.roadmap, t.status, t.creator_id,
               ta.planned_labor as assignee_planned_labor, ta.actual_labor as assignee_actual_labor
        FROM tasks t
        JOIN task_assignees ta ON t.id = ta.task_id
        JOIN users u ON ta.user_id = u.id
        WHERE t.team_id = ? AND t.start_date BETWEEN ? AND ?
        ORDER BY {ordering[request.optimization_param]}, t.start_date
    """, (request.team_id, request.start_date, request.end_date))

    rows = cursor.fetchall()
    columns = [column[0] for column in cursor.description]

    user_tasks = {}
    for row in rows:
        data = dict(zip(columns, row))
        user_id = data["user_id"]
        user_name = data["user_name"]
        user_tasks.setdefault(user_id, {"user_name": user_name, "tasks": []})
        
        # Process task to match TaskResponse format
        processed_task = {
            "id": data["id"],
            "description": data["description"],
            "priority": data["priority"],
            "team_id": data["team_id"],
            "start_date": data["start_date"],
            "completion_date": data["completion_date"],
            "planned_labor": data["planned_labor"],
            "actual_labor": data["actual_labor"],
            "work_size": data["work_size"],
            "roadmap": data["roadmap"],
            "status": data["status"],
            "creator_id": data["creator_id"],
            "assignees": [{
                "id": data["id"],  # Using task id as assignee id since we don't have it
                "task_id": data["id"],
                "user_id": user_id,
                "role": "assignee",  # Default role since we don't have it in the query
                "planned_labor": data["assignee_planned_labor"],
                "actual_labor": data["assignee_actual_labor"]
            }]
        }
        user_tasks[user_id]["tasks"].append(processed_task)

    response = []
    for user_id, info in user_tasks.items():
        daily_distribution = calculate_daily_labor_distribution(info["tasks"], request.start_date, request.end_date)
        response.append(UserDetailedTaskDistribution(
            user_id=user_id,
            user_name=info["user_name"],
            daily_distribution=daily_distribution
        ))

    return response
