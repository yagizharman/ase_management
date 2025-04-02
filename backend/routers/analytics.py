from fastapi import APIRouter, Depends, HTTPException, status, Query
from database import get_db
from schemas import UserDetailedTaskDistribution, DailyTaskDistribution, TaskResponse
from typing import List
from routers.auth import get_current_user, UserInfo
from datetime import date, timedelta
import pyodbc

router = APIRouter()

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
                distribution[current_date]["tasks"].append(task)
            current_date += timedelta(days=1)

    return [DailyTaskDistribution(**day) for day in distribution.values()]

# Çalışan için detaylı görev dağılım endpoint'i
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
        SELECT t.id, t.description, t.priority, t.start_date, t.completion_date, ta.planned_labor, ta.actual_labor
        FROM tasks t
        JOIN task_assignees ta ON t.id = ta.task_id
        WHERE ta.user_id = ? AND t.start_date BETWEEN ? AND ?
    """, (user_id, start_date, end_date))

    tasks = [dict(zip([column[0] for column in cursor.description], row)) for row in cursor.fetchall()]

    daily_distribution = calculate_daily_labor_distribution(tasks, start_date, end_date)

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
    team_id: int,
    optimization_param: str = Query("priority", enum=["priority", "work_size", "completion_date"]),
    start_date: date = Query(...),
    end_date: date = Query(...),
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    if current_user.role != 'manager' or current_user.team_id != team_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Yetkisiz erişim.")

    cursor = db.cursor()

    ordering = {
        "priority": "CASE t.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END",
        "work_size": "t.work_size DESC",
        "completion_date": "t.completion_date"
    }

    cursor.execute(f"""
        SELECT u.id as user_id, u.name as user_name, t.id, t.description, t.priority, t.start_date, t.completion_date, ta.planned_labor, ta.actual_labor
        FROM tasks t
        JOIN task_assignees ta ON t.id = ta.task_id
        JOIN users u ON ta.user_id = u.id
        WHERE t.team_id = ? AND t.start_date BETWEEN ? AND ?
        ORDER BY {ordering[optimization_param]}, t.start_date
    """, (team_id, start_date, end_date))

    rows = cursor.fetchall()
    columns = [column[0] for column in cursor.description]

    user_tasks = {}
    for row in rows:
        data = dict(zip(columns, row))
        user_id = data["user_id"]
        user_name = data["user_name"]
        user_tasks.setdefault(user_id, {"user_name": user_name, "tasks": []})
        user_tasks[user_id]["tasks"].append(data)

    response = []
    for user_id, info in user_tasks.items():
        daily_distribution = calculate_daily_labor_distribution(info["tasks"], start_date, end_date)
        response.append(UserDetailedTaskDistribution(
            user_id=user_id,
            user_name=info["user_name"],
            daily_distribution=daily_distribution
        ))

    return response
