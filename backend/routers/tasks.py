from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from schemas import Task, TaskCreate, TaskUpdate, TaskPartner, TaskPartnerCreate, TaskWithPartners
from typing import List

router = APIRouter()

@router.get("/", response_model=List[TaskWithPartners])
def get_tasks(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Tasks")
    tasks = cursor.fetchall()
    
    # Get partners for each task
    tasks_with_partners = []
    for task in tasks:
        task_dict = dict(zip([column[0] for column in cursor.description], task))
        
        # Get partners for this task
        cursor.execute("SELECT * FROM TaskPartners WHERE TaskId=?", task_dict['TaskId'])
        partners = cursor.fetchall()
        task_dict['Partners'] = [dict(zip([column[0] for column in cursor.description], partner)) for partner in partners]
        
        tasks_with_partners.append(task_dict)
    
    return tasks_with_partners

@router.post("/", response_model=TaskWithPartners)
def create_task(task: TaskCreate, partners: List[TaskPartnerCreate] = [], db=Depends(get_db)):
    cursor = db.cursor()
    # Insert the task and get the generated ID in one query
    cursor.execute("""
        INSERT INTO Tasks (Title, Description, Priority, Team, StartDate, DueDate, CreatedByUserId, AssignedToUserId, PlannedHours, SpentHours, ValueSize, Status, RoadMap)
        OUTPUT INSERTED.TaskId
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (task.Title, task.Description, task.Priority, task.Team, task.StartDate, task.DueDate,
          task.CreatedByUserId, task.AssignedToUserId, task.PlannedHours, task.SpentHours,
          task.ValueSize, task.Status, task.RoadMap))
    
    task_id = cursor.fetchone()[0]  # Get the ID from the OUTPUT clause
    
    # Insert task partners
    task_partners = []
    for partner in partners:
        cursor.execute("""
            INSERT INTO TaskPartners (TaskId, UserId, PlannedHours, SpentHours, RoadMap)
            OUTPUT INSERTED.*
            VALUES (?, ?, ?, ?, ?)
        """, (task_id, partner.UserId, partner.PlannedHours, partner.SpentHours, partner.RoadMap))
        partner_row = cursor.fetchone()
        task_partners.append(dict(zip([column[0] for column in cursor.description], partner_row)))
    
    db.commit()

    # Create a TaskWithPartners instance
    created_task = TaskWithPartners(
        TaskId=task_id,
        Title=task.Title,
        Description=task.Description,
        Priority=task.Priority,
        Team=task.Team,
        StartDate=task.StartDate,
        DueDate=task.DueDate,
        CreatedByUserId=task.CreatedByUserId,
        AssignedToUserId=task.AssignedToUserId,
        PlannedHours=task.PlannedHours,
        SpentHours=task.SpentHours,
        ValueSize=task.ValueSize,
        Status=task.Status,
        RoadMap=task.RoadMap,
        Partners=task_partners
    )

    return created_task

@router.get("/{task_id}", response_model=TaskWithPartners)
def get_task(task_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Tasks WHERE TaskId=?", task_id)
    task = cursor.fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_dict = dict(zip([column[0] for column in cursor.description], task))
    
    # Get partners for this task
    cursor.execute("SELECT * FROM TaskPartners WHERE TaskId=?", task_id)
    partners = cursor.fetchall()
    task_dict['Partners'] = [dict(zip([column[0] for column in cursor.description], partner)) for partner in partners]
    
    return task_dict

@router.put("/{task_id}", response_model=TaskWithPartners)
def update_task(task_id: int, update_request: dict, user_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    
    # First get the existing task
    cursor.execute("SELECT * FROM Tasks WHERE TaskId=?", task_id)
    existing_task = cursor.fetchone()
    if not existing_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_dict = dict(zip([column[0] for column in cursor.description], existing_task))
    
    # Get task_update and partners from the request
    task_update = update_request.get("task_update", {})
    partners = update_request.get("partners", [])
    
    # Check if user is the creator, assigned user, or a partner
    cursor.execute("SELECT * FROM TaskPartners WHERE TaskId=? AND UserId=?", task_id, user_id)
    is_partner = cursor.fetchone() is not None
    
    if task_dict['CreatedByUserId'] != user_id and task_dict['AssignedToUserId'] != user_id and not is_partner:
        raise HTTPException(status_code=403, detail="You don't have permission to update this task")
    
    # If user is not the creator, they can only update their own parameters
    if task_dict['CreatedByUserId'] != user_id:
        allowed_fields = ['SpentHours', 'Status']
        task_update = {k: v for k, v in task_update.items() if k in allowed_fields}
    
    # Create update query dynamically based on provided fields
    update_fields = []
    update_values = []
    
    for field, value in task_update.items():
        update_fields.append(f"{field}=?")
        update_values.append(value)
    
    if update_fields:
        # Add task_id to the values
        update_values.append(task_id)
        
        # Construct and execute the update query
        query = f"""
            UPDATE Tasks 
            SET {', '.join(update_fields)}
            WHERE TaskId=?
        """
        cursor.execute(query, update_values)
    
    # Handle partner updates
    if partners:
        if task_dict['CreatedByUserId'] == user_id:
            # Creator can update all partners
            cursor.execute("DELETE FROM TaskPartners WHERE TaskId=?", task_id)
            for partner in partners:
                cursor.execute("""
                    INSERT INTO TaskPartners (TaskId, UserId, PlannedHours, SpentHours, RoadMap)
                    VALUES (?, ?, ?, ?, ?)
                """, (task_id, partner["UserId"], partner["PlannedHours"], partner["SpentHours"], partner["RoadMap"]))
        else:
            # Partners can only update their own parameters
            for partner in partners:
                if partner["UserId"] == user_id:
                    cursor.execute("""
                        UPDATE TaskPartners 
                        SET SpentHours = ?
                        WHERE TaskId = ? AND UserId = ?
                    """, (partner["SpentHours"], task_id, user_id))
    
    db.commit()
    
    # Fetch and return the updated task with partners
    cursor.execute("SELECT * FROM Tasks WHERE TaskId=?", task_id)
    updated_task = cursor.fetchone()
    task_dict = dict(zip([column[0] for column in cursor.description], updated_task))
    
    # Get partners for this task
    cursor.execute("SELECT * FROM TaskPartners WHERE TaskId=?", task_id)
    partners = cursor.fetchall()
    task_dict['Partners'] = [dict(zip([column[0] for column in cursor.description], partner)) for partner in partners]
    
    return task_dict

@router.delete("/{task_id}")
def delete_task(task_id: int, user_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    
    # First check if the task exists and if the user is the creator
    cursor.execute("SELECT CreatedByUserId FROM Tasks WHERE TaskId=?", task_id)
    task = cursor.fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    if task[0] != user_id:
        raise HTTPException(status_code=403, detail="Only the task creator can delete this task")
    
    cursor.execute("DELETE FROM Tasks WHERE TaskId=?", task_id)
    db.commit()
    return {"detail": "Task deleted successfully"}
