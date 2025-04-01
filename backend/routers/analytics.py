from fastapi import APIRouter, Depends, HTTPException, Query, status
from database import get_db
from datetime import date # Use date for date-only fields
from routers.auth import get_current_user, UserInfo
from typing import List
from schemas import UserTaskDistributionItem, TeamPerformanceItem # Import response schemas

router = APIRouter()

# Helper to convert pyodbc rows to dicts
def rows_to_dicts(cursor):
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]

@router.get("/user-task-distribution", response_model=List[UserTaskDistributionItem])
def user_task_distribution(
    # Use current user's ID by default, allow manager to query others?
    user_id: int,
    start_date: date = Query(...), # Make query params explicit
    end_date: date = Query(...),
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    # Permission Check: Can current_user view distribution for user_id?
    if user_id != current_user.id and current_user.role != 'manager':
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view distribution for other users")
    # Optional: Manager can only view users in their team?
    if current_user.role == 'manager':
         cursor_perm = db.cursor()
         cursor_perm.execute("SELECT team_id FROM users WHERE id = ?", (user_id,))
         target_user_team = cursor_perm.fetchone()
         if not target_user_team or target_user_team[0] != current_user.team_id:
              raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager can only view users within their team")


    cursor = db.cursor()
    try:
        # Fetch tasks assigned to the user within the date range
        # Group by requested fields
        # Note: Column names in SQL result must match Pydantic model field names (or use aliases)
        # Using original casing from old schema for compatibility, but snake_case is preferred (e.g., work_size AS ValueSize)
        cursor.execute("""
            SELECT
                t.priority AS Priority,
                t.work_size AS ValueSize,
                t.completion_date AS DueDate,
                COUNT(t.id) as TaskCount
            FROM tasks t
            JOIN task_assignees ta ON t.id = ta.task_id
            WHERE ta.user_id = ? AND ta.role IN ('assignee', 'partner')
              AND t.start_date BETWEEN ? AND ? -- Or filter based on completion_date? Clarify requirement.
            GROUP BY t.priority, t.work_size, t.completion_date
            ORDER BY t.completion_date, t.priority -- Add ordering
        """, (user_id, start_date, end_date))
        distribution = rows_to_dicts(cursor)
        return distribution
    except pyodbc.Error as e:
        print(f"Database error fetching user task distribution: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch task distribution")
    except Exception as e:
        print(f"Unexpected error fetching user task distribution: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")


@router.get("/team-performance", response_model=List[TeamPerformanceItem])
def team_performance(
    # Use current user's team ID by default
    team_id: int,
    start_date: date = Query(...),
    end_date: date = Query(...),
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    # Permission Check: Can user view performance for this team_id?
    if team_id != current_user.team_id and current_user.role != 'manager': # Allow manager override?
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view performance data for other teams")
    # Even if manager, restrict to their own team based on PDF?
    if current_user.role == 'manager' and team_id != current_user.team_id:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Managers can only view performance for their own team")


    cursor = db.cursor()
    try:
        # Sum planned/actual labor from task_assignees for users in the team within the date range
        # Note: Column names in SQL result must match Pydantic model field names (or use aliases)
        cursor.execute("""
            SELECT
                ta.user_id AS UserId,
                SUM(ta.planned_labor) AS TotalPlanned, -- Per-user planned labor on tasks
                SUM(ta.actual_labor) AS TotalSpent    -- Per-user actual labor
            FROM task_assignees ta
            JOIN tasks t ON ta.task_id = t.id
            WHERE t.team_id = ?
              AND t.start_date BETWEEN ? AND ? -- Or filter based on completion_date? Clarify requirement.
              AND ta.role IN ('assignee', 'partner') -- Include partners in performance? Check req.
            GROUP BY ta.user_id
        """, (team_id, start_date, end_date))
        performance = rows_to_dicts(cursor)
        return performance
    except pyodbc.Error as e:
        print(f"Database error fetching team performance: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch team performance")
    except Exception as e:
        print(f"Unexpected error fetching team performance: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")
