from fastapi import APIRouter, Depends, HTTPException, status, Query
from database import get_db
from typing import List, Optional
from routers.auth import get_current_user, UserInfo
import pyodbc
from datetime import datetime

router = APIRouter()

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_notification(
    notification_data: dict,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Create a new notification"""
    cursor = db.cursor()
    try:
        cursor.execute("""
            INSERT INTO notifications (recipient_email, subject, body, sent_at, is_read)
            OUTPUT INSERTED.id
            VALUES (?, ?, ?, ?, ?)
        """, (
            notification_data["recipient_email"],
            notification_data["subject"],
            notification_data["body"],
            datetime.now(),
            False
        ))
        notification_id = cursor.fetchone()[0]
        db.commit()
        return {"id": notification_id}
    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error creating notification: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create notification")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error creating notification: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.get("/", response_model=List[dict])
def get_notifications(
    recipient_email: str = Query(...),
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Get notifications for a user"""
    # Permission check: User can only view their own notifications
    if recipient_email != current_user.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot view notifications for other users")
    
    cursor = db.cursor()
    try:
        cursor.execute("""
            SELECT id, recipient_email, subject, body, sent_at, is_read
            FROM notifications
            WHERE recipient_email = ?
            ORDER BY sent_at DESC
        """, (recipient_email,))
        
        notifications = []
        for row in cursor.fetchall():
            notifications.append({
                "id": row[0],
                "recipient_email": row[1],
                "subject": row[2],
                "body": row[3],
                "sent_at": row[4],
                "is_read": row[5]
            })
        return notifications
    except pyodbc.Error as e:
        print(f"Database error fetching notifications: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch notifications")
    except Exception as e:
        print(f"Unexpected error fetching notifications: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.put("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    data: dict,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Mark a notification as read"""
    # Permission check: User can only mark their own notifications as read
    if data["recipient_email"] != current_user.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify notifications for other users")
    
    cursor = db.cursor()
    try:
        cursor.execute("""
            UPDATE notifications
            SET is_read = 1
            WHERE id = ? AND recipient_email = ?
        """, (notification_id, data["recipient_email"]))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
        
        db.commit()
        return {"message": "Notification marked as read"}
    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error marking notification as read: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to mark notification as read")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error marking notification as read: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

@router.put("/read-all")
def mark_all_notifications_as_read(
    data: dict,
    db=Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Mark all notifications as read for a user"""
    # Permission check: User can only mark their own notifications as read
    if data["recipient_email"] != current_user.email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot modify notifications for other users")
    
    cursor = db.cursor()
    try:
        cursor.execute("""
            UPDATE notifications
            SET is_read = 1
            WHERE recipient_email = ? AND is_read = 0
        """, (data["recipient_email"],))
        
        db.commit()
        return {"message": f"{cursor.rowcount} notifications marked as read"}
    except pyodbc.Error as e:
        db.rollback()
        print(f"Database error marking all notifications as read: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to mark notifications as read")
    except Exception as e:
        db.rollback()
        print(f"Unexpected error marking all notifications as read: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An unexpected error occurred")

