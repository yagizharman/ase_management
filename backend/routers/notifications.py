from fastapi import APIRouter, Depends, HTTPException
from database import get_db
from typing import List

router = APIRouter()

@router.get("/")
def get_notifications(receiver_user_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        SELECT NotificationId, TaskId, SenderUserId, ReceiverUserId, NotificationType, NotificationDate, IsRead
        FROM Notifications
        WHERE ReceiverUserId=?
        ORDER BY NotificationDate DESC
    """, receiver_user_id)
    notifications = cursor.fetchall()
    return [dict(zip([column[0] for column in cursor.description], notification)) for notification in notifications]

@router.post("/")
def create_notification(task_id: int, sender_user_id: int, receiver_user_id: int, notification_type: str, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("""
        INSERT INTO Notifications (TaskId, SenderUserId, ReceiverUserId, NotificationType)
        VALUES (?, ?, ?, ?)
    """, task_id, sender_user_id, receiver_user_id, notification_type)
    db.commit()
    return {"detail": "Notification created"}

@router.put("/{notification_id}/read")
def mark_notification_as_read(notification_id: int, db=Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("UPDATE Notifications SET IsRead=1 WHERE NotificationId=?", notification_id)
    db
