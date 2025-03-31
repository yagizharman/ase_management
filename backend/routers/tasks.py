from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from schemas import Task, TaskCreate
from typing import List

router = APIRouter()

@router.get("/", response_model=List[Task])
def get_tasks(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Tasks")
    tasks = cursor.fetchall()
    return tasks

@router.post("/", response_model=Task)
def create_task(task: TaskCreate, db=Depends(get_db)):
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
    db.commit()

    # Create a Task instance with the generated ID
    created_task = Task(
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
        RoadMap=task.RoadMap
    )

    return created_task

@router.get("/{task_id}", response_model=Task)
def get_task(task_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Tasks WHERE TaskId=?", task_id)
    task = cursor.fetchone()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{task_id}", response_model=Task)
def update_task(task_id: int, task: Task, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        UPDATE Tasks SET Title=?, Description=?, Priority=?, Team=?, StartDate=?, DueDate=?, AssignedToUserId=?, PlannedHours=?, SpentHours=?, ValueSize=?, Status=?, RoadMap=?
        WHERE TaskId=?
    """, task.Title, task.Description, task.Priority, task.Team, task.StartDate, task.DueDate,
       task.AssignedToUserId, task.PlannedHours, task.SpentHours, task.ValueSize, task.Status, task.RoadMap, task_id)
    db.commit()
    return task

@router.delete("/{task_id}")
def delete_task(task_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM Tasks WHERE TaskId=?", task_id)
    db.commit()
    return {"detail": "Task deleted successfully"}
