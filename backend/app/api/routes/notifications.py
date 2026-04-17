from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import schemas
from app.api import deps
from app.crud.notifications import list_notifications, mark_notifications_read

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("", response_model=list[schemas.NotificationRead])
def get_notifications(
    unread_only: bool = False,
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_session_user),
):
    """List notifications for the current user."""
    return list_notifications(db, current_user.id, unread_only)

@router.post("/read")
def mark_read(
    db: Session = Depends(deps.get_db),
    current_user=Depends(deps.get_current_session_user),
):
    """Mark all unread notifications as read."""
    mark_notifications_read(db, current_user.id)
    return {"detail": "ok"}