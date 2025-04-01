from fastapi import APIRouter, Depends, HTTPException, status
from database import get_db
from schemas import UserResponse, TaskResponse,UserUpdate, PasswordUpdateRequest # Updated Schemas
from typing import List
from routers.auth import get_current_user, UserInfo

router = APIRouter()

# Example: Protect endpoint - only allow logged-in users
@router.get("/", response_model=List[UserResponse]) #, dependencies=[Depends(get_current_user)])
def get_users(db=Depends(get_db)):
    cursor = db.cursor()
    # Select columns matching UserResponse
    cursor.execute("SELECT id, name, username, email, role, team_id FROM users")
    users = cursor.fetchall()
    # Convert rows to dicts
    columns = [column[0] for column in cursor.description]
    return [dict(zip(columns, row)) for row in users]

@router.get("/{user_id}", response_model=UserResponse) #, dependencies=[Depends(get_current_user)])
def get_user(user_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT id, name, username, email, role, team_id
        FROM users
        WHERE id=?
    """, (user_id,))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    columns = [column[0] for column in cursor.description]
    return dict(zip(columns, user))

# Get tasks ASSIGNED to a specific user
@router.get("/{user_id}/tasks", response_model=List[TaskResponse]) #, dependencies=[Depends(get_current_user)])
def get_user_tasks(user_id: int, db=Depends(get_db)):
    cursor = db.cursor()

    # Fetch tasks where the user is an assignee or partner
    cursor.execute("""
        SELECT DISTINCT t.id
        FROM tasks t
        JOIN task_assignees ta ON t.id = ta.task_id
        WHERE ta.user_id = ? AND ta.role IN ('assignee', 'partner')
    """, (user_id,))

    task_ids = [row[0] for row in cursor.fetchall()]
    if not task_ids:
        return []

    # Fetch full task details for these tasks
    # Using IN clause - be mindful of potential performance issues with very large lists
    # and the max number of parameters allowed by the driver/db.
    task_query = f"""
        SELECT
            t.id, t.description, t.priority, t.team_id, t.start_date, t.completion_date,
            t.creator_id, t.planned_labor, t.actual_labor, t.work_size, t.roadmap, t.status
        FROM tasks t
        WHERE t.id IN ({','.join('?' * len(task_ids))})
    """
    cursor.execute(task_query, task_ids)
    tasks_raw = cursor.fetchall()
    task_columns = [col[0] for col in cursor.description]
    tasks_dict = {row[0]: dict(zip(task_columns, row)) for row in tasks_raw}

    # Fetch assignees for these tasks
    assignee_query = f"""
        SELECT id, task_id, user_id, role, planned_labor, actual_labor
        FROM task_assignees
        WHERE task_id IN ({','.join('?' * len(task_ids))})
    """
    cursor.execute(assignee_query, task_ids)
    assignees_raw = cursor.fetchall()
    assignee_columns = [col[0] for col in cursor.description]

    # Group assignees by task_id
    for assignee_row in assignees_raw:
        assignee_dict = dict(zip(assignee_columns, assignee_row))
        task_id = assignee_dict['task_id']
        if task_id in tasks_dict:
            if 'assignees' not in tasks_dict[task_id]:
                tasks_dict[task_id]['assignees'] = []
            tasks_dict[task_id]['assignees'].append(assignee_dict)

    return list(tasks_dict.values())
@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_data: UserUpdate,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    # Fetch the user being updated to check permissions and existence
    cursor = db.cursor()
    cursor.execute("SELECT id, name, username, email, role, team_id FROM users WHERE id=?", (user_id,))
    target_user_row = cursor.fetchone()
    if not target_user_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User to update not found")

    target_user = dict(zip([col[0] for col in cursor.description], target_user_row))

    # --- PERMISSION CHECK ---
    can_update = False
    # 1. Can users update themselves?
    if user_id == current_user.id:
        can_update = True
        # Users cannot change their own role or team_id via this endpoint
        if user_data.dict(exclude_unset=True).keys() & {'role', 'team_id'}:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Users cannot change their own role or team.")
    # 2. Can managers update users in their team?
    elif current_user.role == 'manager' and target_user['team_id'] == current_user.team_id:
        can_update = True
        # Managers cannot change user's role or team via this endpoint? (Define this rule)
        # Let's assume for now managers can only update name/email of their team members here.
        if user_data.dict(exclude_unset=True).keys() & {'role', 'team_id'}:
             raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Managers cannot change user role or team via this endpoint.")

    if not can_update:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to update this user.")

    update_dict = user_data.dict(exclude_unset=True) # Get only provided fields
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    # Check for email uniqueness if email is being changed
    if 'email' in update_dict and update_dict['email'] != target_user['email']:
        cursor.execute("SELECT id FROM users WHERE email=? AND id != ?", (update_dict['email'], user_id))
        if cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered by another user.")

    set_clause = ", ".join([f"{field}=?" for field in update_dict])
    params = list(update_dict.values()) + [user_id]

    try:
        cursor.execute(f"UPDATE users SET {set_clause} WHERE id=?", params)
        db.commit()

        # Fetch the updated user data to return
        cursor.execute("SELECT id, name, username, email, role, team_id FROM users WHERE id=?", (user_id,))
        updated_user = cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, updated_user))

    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error updating user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update user.")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error updating user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")

# Separate endpoint for password changes is generally more secure
@router.put("/{user_id}/password")
def update_password(
    user_id: int,
    password_data: PasswordUpdateRequest,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    # PERMISSION CHECK: Only the user themselves can change their password
    if user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot change another user's password.")

    cursor = db.cursor()
    # Verify current password
    cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
    user_pw = cursor.fetchone()

    if not user_pw:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found") # Should not happen if token is valid

    # Use the verify_password function from auth.py (might need to import it or move it to a utils file)
    from auth import verify_password, hash_password # Quick import, consider refactoring later
    if not verify_password(password_data.current_password, user_pw[0]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password.")

    # Hash the new password
    new_hashed_password = hash_password(password_data.new_password)

    try:
        cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (new_hashed_password, user_id))
        db.commit()
        return {"message": "Password updated successfully"}
    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error updating password for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update password.")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error updating password for user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")
