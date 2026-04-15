from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.security import hash_password, verify_password


def create_user(db: Session, payload: schemas.UserCreate) -> models.User:
    user = models.User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        bio=payload.bio,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session) -> list[models.User]:
    return list(db.scalars(select(models.User).order_by(models.User.created_at.asc())))


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return db.scalar(select(models.User).where(models.User.username == username))


def update_user(db: Session, username: str, payload: schemas.UserUpdate) -> models.User | None:
    user = get_user_by_username(db, username)
    if not user:
        return None
    user.display_name = payload.display_name
    user.bio = payload.bio
    if payload.password:
        user.password_hash = hash_password(payload.password)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, payload: schemas.UserLogin) -> models.User | None:
    user = get_user_by_username(db, payload.username)
    if not user:
        return None
    if not verify_password(payload.password, user.password_hash):
        return None
    return user


def get_user_profile(
    db: Session,
    username: str,
    recent_posts: list[schemas.PostRead],
    viewer_user_id: int | None = None,
) -> schemas.UserProfileResponse | None:
    user = get_user_by_username(db, username)
    if not user:
        return None

    stats_query = select(
        func.count(func.distinct(models.Post.id)).label("post_count"),
        func.count(func.distinct(models.Like.id)).label("total_likes_received"),
        func.count(func.distinct(models.Comment.id)).label("total_comments_received"),
        func.count(func.distinct(models.Follow.id)).label("followers_count"),
    ).select_from(models.User)
    stats_query = stats_query.outerjoin(models.Post, models.Post.user_id == models.User.id)
    stats_query = stats_query.outerjoin(models.Like, models.Like.post_id == models.Post.id)
    stats_query = stats_query.outerjoin(models.Comment, models.Comment.post_id == models.Post.id)
    stats_query = stats_query.outerjoin(models.Follow, models.Follow.followee_id == models.User.id)
    stats_query = stats_query.where(models.User.id == user.id).group_by(models.User.id)

    following_count = db.scalar(
        select(func.count(models.Follow.id)).where(models.Follow.follower_id == user.id)
    ) or 0
    following_usernames = list_following_usernames(db, user.id) if viewer_user_id == user.id else []

    is_following = False
    if viewer_user_id and viewer_user_id != user.id:
        is_following = db.scalar(
            select(models.Follow.id).where(
                models.Follow.follower_id == viewer_user_id,
                models.Follow.followee_id == user.id,
            )
        ) is not None

    stats_row = db.execute(stats_query).one_or_none()
    stats = schemas.UserProfileStats(
        post_count=0,
        total_likes_received=0,
        total_comments_received=0,
        followers_count=0,
        following_count=following_count,
    )
    if stats_row:
        stats = schemas.UserProfileStats.model_validate(
            {
                **stats_row._mapping,
                "following_count": following_count,
            }
        )

    return schemas.UserProfileResponse(
        user=schemas.UserRead.model_validate(user),
        stats=stats,
        recent_posts=recent_posts[:6],
        is_following=is_following,
        following_usernames=following_usernames,
    )


def list_user_history(db: Session, username: str) -> list[schemas.ViewHistoryRead]:
    user = get_user_by_username(db, username)
    if not user:
        return []

    rows = db.execute(
        select(
            models.ViewHistory.id,
            models.ViewHistory.post_id,
            models.ViewHistory.viewed_at,
            models.User.username,
            models.User.display_name,
            models.Post.description,
            models.Post.image_url,
        )
        .join(models.Post, models.Post.id == models.ViewHistory.post_id)
        .join(models.User, models.User.id == models.Post.user_id)
        .where(models.ViewHistory.user_id == user.id)
        .order_by(models.ViewHistory.viewed_at.desc())
    ).all()
    return [schemas.ViewHistoryRead.model_validate(row._mapping) for row in rows]


def toggle_follow(db: Session, follower_user_id: int, followee_username: str) -> schemas.FollowToggleResponse | None:
    followee = get_user_by_username(db, followee_username)
    if not followee:
        return None
    if follower_user_id == followee.id:
        raise ValueError("You cannot follow yourself")

    existing = db.scalar(
        select(models.Follow).where(
            models.Follow.follower_id == follower_user_id,
            models.Follow.followee_id == followee.id,
        )
    )

    is_following = False
    if existing:
        db.delete(existing)
        db.commit()
    else:
        db.add(models.Follow(follower_id=follower_user_id, followee_id=followee.id))
        try:
            db.commit()
            is_following = True
        except IntegrityError:
            db.rollback()

    followers_count = db.scalar(
        select(func.count(models.Follow.id)).where(models.Follow.followee_id == followee.id)
    ) or 0

    return schemas.FollowToggleResponse(
        username=followee.username,
        is_following=is_following,
        followers_count=followers_count,
    )


def list_following_usernames(db: Session, follower_user_id: int) -> list[str]:
    rows = db.execute(
        select(models.User.username)
        .join(models.Follow, models.Follow.followee_id == models.User.id)
        .where(models.Follow.follower_id == follower_user_id)
        .order_by(models.User.username.asc())
    ).all()
    return [row[0] for row in rows]
