from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from schemas import Task
from typing import List

router = APIRouter()

@router.get("/", response_model=List[Task])
def get_tasks(db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM Tasks")
    tasks = cursor.fetchall()
    return tasks

@router.post("/", response_model=Task)
def create_task(task: Task, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Tasks (Title, Description, Priority, Team, StartDate, DueDate, CreatedByUserId, AssignedToUserId, PlannedHours, SpentHours, ValueSize, Status, RoadMap)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        SELECT SCOPE_IDENTITY();
    """, task.Title, task.Description, task.Priority, task.Team, task.StartDate, task.DueDate,
       task.CreatedByUserId, task.AssignedToUserId, task.PlannedHours, task.SpentHours,
       task.ValueSize, task.Status, task.RoadMap)
    task_id = cursor.fetchone()[0]
    db.commit()
    task.TaskId = task_id
    return task

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
