from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from database import get_db
from schemas import Team, TeamCreate, TeamUpdate, UserResponse # Import necessary schemas
from routers.auth import get_current_user, UserInfo # Import auth dependency
import pyodbc

router = APIRouter()

# Helper to check if a user exists and is a manager
def verify_manager(db, user_id: int) -> bool:
    cursor = db.cursor()
    cursor.execute("SELECT role FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    return user is not None and user[0] == 'manager'

@router.post("/", response_model=Team, status_code=status.HTTP_201_CREATED)
def create_team(
    team_data: TeamCreate,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    # PERMISSION CHECK: Only managers can create teams? (Adjust if needed)
    if current_user.role != 'manager':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers can create new teams."
        )

    # Optional Validation: Check if manager_id exists and is actually a manager
    if team_data.manager_id and not verify_manager(db, team_data.manager_id):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User ID {team_data.manager_id} is not a valid manager."
         )

    cursor = db.cursor()
    try:
        cursor.execute(
            "INSERT INTO teams (name, manager_id) OUTPUT INSERTED.id, INSERTED.name, INSERTED.manager_id VALUES (?, ?)",
            (team_data.name, team_data.manager_id)
        )
        new_team_row = cursor.fetchone()
        db.commit()
        if not new_team_row:
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create team")

        return Team(id=new_team_row[0], name=new_team_row[1], manager_id=new_team_row[2])

    except pyodbc.IntegrityError: # Catches potential duplicate names if unique constraint exists
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Team name '{team_data.name}' might already exist."
        )
    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error creating team: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create team.")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error creating team: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")


@router.get("/", response_model=List[Team])
def get_teams(
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user) # Require login to view teams
):
    # PERMISSION CHECK: Assume all logged-in users can list teams. Adjust if needed.
    cursor = db.cursor()
    cursor.execute("SELECT id, name, manager_id FROM teams ORDER BY name")
    teams_raw = cursor.fetchall()
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in teams_raw]


@router.get("/{team_id}", response_model=Team)
def get_team(
    team_id: int,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user) # Require login
):
    cursor = db.cursor()
    cursor.execute("SELECT id, name, manager_id FROM teams WHERE id = ?", (team_id,))
    team = cursor.fetchone()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    # PERMISSION CHECK: Assume all logged-in users can view team details.
    columns = [col[0] for col in cursor.description]
    return dict(zip(columns, team))


@router.put("/{team_id}", response_model=Team)
def update_team(
    team_id: int,
    team_data: TeamUpdate,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    # PERMISSION CHECK: Only managers can update teams? Or maybe only the team's current manager?
    if current_user.role != 'manager':
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers can update teams."
         )
    # More specific check: Only the current manager of *this* team can update it?
    # cursor_perm = db.cursor()
    # cursor_perm.execute("SELECT manager_id FROM teams WHERE id = ?", (team_id,))
    # existing_manager = cursor_perm.fetchone()
    # if not existing_manager or existing_manager[0] != current_user.id:
    #      raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the team's manager can update it.")


    # Optional Validation: Check if new manager_id exists and is a manager
    if team_data.manager_id and not verify_manager(db, team_data.manager_id):
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User ID {team_data.manager_id} is not a valid manager."
         )

    update_dict = team_data.dict(exclude_unset=True)
    if not update_dict:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No update data provided.")

    set_clause = ", ".join([f"{field}=?" for field in update_dict])
    params = list(update_dict.values()) + [team_id]

    cursor = db.cursor()
    try:
        cursor.execute(f"UPDATE teams SET {set_clause} WHERE id=?", params)
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

        db.commit()

        # Fetch the updated team data to return
        cursor.execute("SELECT id, name, manager_id FROM teams WHERE id = ?", (team_id,))
        updated_team = cursor.fetchone()
        columns = [col[0] for col in cursor.description]
        return dict(zip(columns, updated_team))

    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error updating team {team_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not update team.")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error updating team {team_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: int,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    # PERMISSION CHECK: Only managers can delete teams?
    if current_user.role != 'manager':
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only managers can delete teams."
         )

    cursor = db.cursor()
    # Check for associated users or tasks before deleting? VERY IMPORTANT!
    cursor.execute("SELECT COUNT(*) FROM users WHERE team_id = ?", (team_id,))
    user_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM tasks WHERE team_id = ?", (team_id,))
    task_count = cursor.fetchone()[0]

    if user_count > 0 or task_count > 0:
        db.rollback() # Ensure no changes are made
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot delete team {team_id}. It still has {user_count} users and {task_count} tasks associated with it. Reassign them first."
        )

    try:
        cursor.execute("DELETE FROM teams WHERE id=?", (team_id,))
        if cursor.rowcount == 0:
            # No rollback needed as delete didn't happen, but raise error
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

        db.commit()
        return # Return No Content on success

    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error deleting team {team_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not delete team.")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error deleting team {team_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred.")
