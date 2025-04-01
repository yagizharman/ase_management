from fastapi import APIRouter, Depends, HTTPException, status, Body,BackgroundTasks 
from database import get_db
from schemas import ( # Updated schemas
    Task, TaskResponse, TaskCreateData, TaskUpdateData,
    TaskAssignee, TaskAssigneeCreate, TaskHistoryCreate
)
from typing import List, Optional
from routers.auth import get_current_user, UserInfo
import pyodbc
from datetime import datetime
from schemas import TaskHistory # Make sure TaskHistory is imported
router = APIRouter()

# --- Helper Function to Add Task History ---
def add_task_history(db, task_id: int, user_id: int, action: str, details: Optional[str] = None):
    try:
        cursor = db.cursor()
        cursor.execute("""
            INSERT INTO task_history (task_id, user_id, action, timestamp, details)
            VALUES (?, ?, ?, GETDATE(), ?)
        """, (task_id, user_id, action, details))
        # Don't commit here, commit happens after the main operation succeeds
    except pyodbc.Error as e:
        # Log or handle error, but don't let history failure stop main operation?
        print(f"Error adding task history: {e}")
    except Exception as e:
         print(f"Unexpected error in add_task_history: {e}")


# --- Helper to get task with assignees ---
def get_task_with_assignees(task_id: int, db) -> Optional[TaskResponse]:
    cursor = db.cursor()
    cursor.execute("""
        SELECT
            t.id, t.description, t.priority, t.team_id, t.start_date, t.completion_date,
            t.creator_id, t.planned_labor, t.actual_labor, t.work_size, t.roadmap, t.status
        FROM tasks t
        WHERE t.id = ?
    """, (task_id,))
    task_row = cursor.fetchone()
    if not task_row:
        return None

    task_columns = [col[0] for col in cursor.description]
    task_dict = dict(zip(task_columns, task_row))

    # Fetch assignees
    cursor.execute("""
        SELECT id, task_id, user_id, role, planned_labor, actual_labor
        FROM task_assignees
        WHERE task_id = ?
    """, (task_id,))
    assignees_raw = cursor.fetchall()
    assignee_columns = [col[0] for col in cursor.description]
    task_dict['assignees'] = [dict(zip(assignee_columns, row)) for row in assignees_raw]

    return TaskResponse(**task_dict)


@router.get("/", response_model=List[TaskResponse])
def get_tasks(
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
    # Add filters based on requirements (e.g., team, status)
    team_id: Optional[int] = None,
    status: Optional[str] = None,
    assigned_to_user_id: Optional[int] = None # Filter by specific assigned user
):
    cursor = db.cursor()
    
    query = """
        SELECT DISTINCT t.id
        FROM tasks t
        LEFT JOIN task_assignees ta ON t.id = ta.task_id
        WHERE 1=1
    """
    params = []

    # Apply filters
    # Requirement: Employees see their team's tasks, Managers see their team's tasks
    # Let's assume everyone can see tasks in their own team by default
    query += " AND t.team_id = ?"
    params.append(current_user.team_id)

    # Optional filters from query parameters
    if team_id is not None: # Allow overriding team filter if needed? Or restrict based on role?
        if current_user.role == 'manager': # Manager can potentially view other teams? TBD by exact req.
             query += " AND t.team_id = ?"
             params.append(team_id)
        # else: employee restricted to their team only (already applied)
            
    if status:
        query += " AND t.status = ?"
        params.append(status)

    if assigned_to_user_id:
        query += " AND ta.user_id = ? AND ta.role IN ('assignee', 'partner')" # Ensure user is involved
        params.append(assigned_to_user_id)

    cursor.execute(query, params)
    
    task_ids = [row[0] for row in cursor.fetchall()]
    if not task_ids:
        return []

    # Fetch full task details for these tasks
    tasks_list = []
    for task_id in task_ids:
        task_details = get_task_with_assignees(task_id, db)
        if task_details:
            tasks_list.append(task_details)

    return tasks_list


@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task( # Make endpoint async (if not already)
    task_data: TaskCreateData,
    background_tasks: BackgroundTasks, # Add background tasks dependency (if not already)
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    # ... (permission checks, validation) ...
    cursor = db.cursor()
    newly_created_task_id = None
    newly_created_task_description = task_data.description

    try:
        # Insert the task - NOTE: We are setting the task's initial planned_labor here directly.
        # This might be overridden by the sum later. Decide which source of truth is primary.
        # Option A: Task planned_labor is the master, assignee planned is distribution (don't call helper for planned)
        # Option B: Sum of assignees is the master (call helper for planned AND actual) - Let's assume Option B for now.
        cursor.execute("""
            INSERT INTO tasks (
                description, priority, team_id, start_date, completion_date, creator_id,
                planned_labor, work_size, roadmap, status, actual_labor
            )
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            task_data.description, task_data.priority, task_data.team_id, task_data.start_date,
            task_data.completion_date, current_user.id, 0, # Set initial task planned_labor to 0, rely on sum
            task_data.work_size, task_data.roadmap, task_data.status
        ))
        task_id = cursor.fetchone()[0]
        newly_created_task_id = task_id

        recipient_user_ids_for_email = set()
        assignee_values_to_insert = [] # Prepare for insertion

        # Prepare assignee insertions
        if task_data.assignees:
            for assignee in task_data.assignees:
                 if assignee.role in ['assignee', 'partner']:
                     recipient_user_ids_for_email.add(assignee.user_id)
                 assignee_values_to_insert.append((
                    task_id, assignee.user_id, assignee.role,
                    assignee.planned_labor, assignee.actual_labor
                ))

        # Insert task assignees if any
        if assignee_values_to_insert:
            insert_assignees_sql = """
                INSERT INTO task_assignees (task_id, user_id, role, planned_labor, actual_labor)
                VALUES (?, ?, ?, ?, ?)
            """
            cursor.executemany(insert_assignees_sql, assignee_values_to_insert)

            # *** Call the helper function AFTER inserting assignees ***
            update_task_total_labor(db, task_id)

        add_task_history(db, task_id, current_user.id, "create", f"Task '{task_data.description[:50]}...' created.")

        db.commit() # Commit all changes together

        # --- Trigger Email Notifications (After Commit) ---
        # ... (existing email notification logic using background_tasks) ...

    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error creating task: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create task")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error creating task: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

    created_task_details = get_task_with_assignees(newly_created_task_id, db)
    if not created_task_details:
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve created task details")
    return created_task_details


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    task = get_task_with_assignees(task_id, db)
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Permission Check: Can user view this task?
    # Must be in the task's team OR a partner/assignee/notified?
    is_involved = any(a.user_id == current_user.id for a in task.assignees)
    if task.team_id != current_user.team_id and not is_involved and current_user.role != 'manager': # Allow manager override?
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this task")

    return task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdateData,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    try:
        existing_task = get_task_with_assignees(task_id, db)
        if not existing_task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

        # Permission checks
        is_creator = existing_task.creator_id == current_user.id
        is_manager_of_team = current_user.role == 'manager' and existing_task.team_id == current_user.team_id
        current_user_assignment = next((a for a in existing_task.assignees if a.user_id == current_user.id), None)
        is_assignee_or_partner = current_user_assignment is not None and current_user_assignment.role in ['assignee', 'partner']

        can_update_fully = is_creator or is_manager_of_team
        can_update_limited = is_assignee_or_partner

        if not can_update_fully and not can_update_limited:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to update this task")

        cursor = db.cursor()
        update_data = task_update.dict(exclude_unset=True)
        assignees_to_add_or_replace = update_data.pop('assignees', None)
        history_note = update_data.pop('history_note', None)  # Extract history note if provided

        # Update task fields
        if update_data:
            update_fields = []
            update_values = []
            for field, value in update_data.items():
                if field not in ['planned_labor', 'actual_labor']:  # These are calculated from assignees
                    update_fields.append(f"{field} = ?")
                    update_values.append(value)
            
            if update_fields:
                update_values.append(task_id)
                cursor.execute(f"""
                    UPDATE tasks 
                    SET {', '.join(update_fields)}
                    WHERE id = ?
                """, update_values)

        # Handle assignee updates
        if assignees_to_add_or_replace is not None:
            # Delete existing assignees
            cursor.execute("DELETE FROM task_assignees WHERE task_id = ?", (task_id,))
            
            # Insert new assignees
            if assignees_to_add_or_replace:
                for assignee in assignees_to_add_or_replace:
                    # Convert assignee to dict if it's a Pydantic model
                    assignee_dict = assignee.dict() if hasattr(assignee, 'dict') else assignee
                    cursor.execute("""
                        INSERT INTO task_assignees (task_id, user_id, role, planned_labor, actual_labor)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        task_id,
                        assignee_dict['user_id'],
                        assignee_dict['role'],
                        assignee_dict.get('planned_labor', 0),
                        assignee_dict.get('actual_labor', 0)
                    ))

        # Update task total labor based on assignees
        update_task_total_labor(db, task_id)

        # Add task history with the provided note or default message
        add_task_history(db, task_id, current_user.id, "update", history_note or "Task updated")

        db.commit()

        # Get updated task
        updated_task = get_task_with_assignees(task_id, db)
        if not updated_task:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve updated task")

        return updated_task

    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error updating task: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update task")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error updating task: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    task_id: int,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    cursor = db.cursor()
    # Get creator_id and team_id to check permission
    cursor.execute("SELECT creator_id, team_id, description FROM tasks WHERE id=?", (task_id,))
    task_info = cursor.fetchone()

    if not task_info:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    creator_id, team_id, description = task_info

    # Debug logging
    print(f"Delete task request: task_id={task_id}, creator_id={creator_id}, team_id={team_id}, current_user_id={current_user.id}, current_user_role={current_user.role}, current_user_team_id={current_user.team_id}")
    print(f"Permission check: is_creator={creator_id == current_user.id}, is_manager_of_team={current_user.role == 'manager' and team_id == current_user.team_id}")

    # Permission Check: Creator or manager of the team can delete
    is_creator = creator_id == current_user.id
    is_manager_of_team = current_user.role == 'manager' and team_id == current_user.team_id

    if not is_creator and not is_manager_of_team:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to delete this task")
         
    # Add history log *before* deleting
    add_task_history(db, task_id, current_user.id, "delete", f"Task '{description[:50]}...' deleted.")

    try:
        # Delete the task (ON DELETE CASCADE should handle task_assignees and task_history)
        cursor.execute("DELETE FROM tasks WHERE id=?", (task_id,))
        rows_deleted = cursor.rowcount

        if rows_deleted == 0:
             # This shouldn't happen if the initial check passed, but as a safeguard
             raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found during delete")

        db.commit()
        return # Return No Content on success

    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error deleting task {task_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete task")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error deleting task {task_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.get("/{task_id}/history", response_model=List[TaskHistory])
def get_task_history(
    task_id: int,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    # First, check if the user has permission to view the main task
    # We can reuse the logic from get_task or call it (calling might be slightly less efficient)
    task = get_task_with_assignees(task_id, db) # Use the helper function
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    # Permission Check (same as viewing the task)
    is_involved = any(a.user_id == current_user.id for a in task.assignees)
    is_manager_of_team = current_user.role == 'manager' and task.team_id == current_user.team_id
    # Allow creator even if not assigned? Maybe. Add task.creator_id == current_user.id if needed.

    if task.team_id != current_user.team_id and not is_involved and not is_manager_of_team:
         raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to view this task's history")

    # Fetch history if permission is granted
    cursor = db.cursor()
    try:
        cursor.execute("""
            SELECT id, task_id, user_id, action, timestamp, details
            FROM task_history
            WHERE task_id = ?
            ORDER BY timestamp DESC
        """, (task_id,))
        history_raw = cursor.fetchall()
        columns = [col[0] for col in cursor.description]
        return [dict(zip(columns, row)) for row in history_raw]
    except pyodbc.Error as e:
         print(f"Database error fetching history for task {task_id}: {e}")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch task history")
    except Exception as e:
         print(f"Unexpected error fetching history for task {task_id}: {e}")
         raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

def update_task_total_labor(db, task_id: int):
    """
    Recalculates the sum of planned and actual labor from task_assignees
    and updates the corresponding fields in the tasks table.
    Should be called within the same transaction as assignee updates.
    """
    cursor_sum = db.cursor()
    try:
        # Calculate sums from assignees
        cursor_sum.execute("""
            SELECT
                SUM(ISNULL(planned_labor, 0)),
                SUM(ISNULL(actual_labor, 0))
            FROM task_assignees
            WHERE task_id = ?
        """, (task_id,))
        sums = cursor_sum.fetchone()
        total_planned = sums[0] if sums and sums[0] is not None else 0.0
        total_actual = sums[1] if sums and sums[1] is not None else 0.0

        # Update the main task table
        cursor_sum.execute("""
            UPDATE tasks
            SET planned_labor = ?, actual_labor = ?
            WHERE id = ?
        """, (total_planned, total_actual, task_id))
        print(f"Updated task {task_id} totals: Planned={total_planned}, Actual={total_actual}") # Debug log

    except pyodbc.Error as e:
        # Log the error, but maybe don't halt the main operation?
        # Or re-raise if task totals are critical. Let's log for now.
        print(f"ERROR: Could not update total labor for task {task_id}: {e}")
        # Optionally raise e here if this update MUST succeed for the transaction to be valid
    except Exception as e:
        print(f"Unexpected error in update_task_total_labor for task {task_id}: {e}")
