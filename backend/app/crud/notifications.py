from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas


def list_notifications(db: Session, user_id: int, unread_only: bool = False):
    query = (
        select(
            models.Notification.id,
            models.Notification.type,
            models.Notification.post_id,
            models.Notification.is_read,
            models.Notification.created_at,
            models.Notification.actor_id,
            models.User.username.label("actor_username"),
            models.User.display_name.label("actor_display_name"),
        )
        .join(models.User, models.User.id == models.Notification.actor_id)
        .where(models.Notification.user_id == user_id)
        .order_by(models.Notification.created_at.desc())
    )

    if unread_only:
        query = query.where(models.Notification.is_read == False)

    rows = db.execute(query).all()
    return [schemas.NotificationRead.model_validate(row._mapping) for row in rows]


def mark_notifications_read(db: Session, user_id: int):
    """Marks all unread notifications for a user as read."""
    unread = db.scalars(
        select(models.Notification).where(
            models.Notification.user_id == user_id,
            models.Notification.is_read == False,
        )
    ).all()

    for n in unread:
        n.is_read = True

    if unread:
        db.commit()
    return True
