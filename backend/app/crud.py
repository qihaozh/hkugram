from sqlalchemy import Select, desc, func, select
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


def create_post(db: Session, payload: schemas.PostCreate) -> models.Post:
    post = models.Post(**payload.model_dump(mode="json"))
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


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


def list_feed(db: Session, sort_by: str = "recent") -> list[schemas.PostRead]:
    like_count = func.count(func.distinct(models.Like.id)).label("like_count")
    comment_count = func.count(func.distinct(models.Comment.id)).label("comment_count")

    query: Select = (
        select(
            models.Post.id,
            models.Post.description,
            models.Post.image_url,
            models.Post.created_at,
            like_count,
            comment_count,
            models.User.username,
            models.User.display_name,
        )
        .join(models.User, models.User.id == models.Post.user_id)
        .outerjoin(models.Like, models.Like.post_id == models.Post.id)
        .outerjoin(models.Comment, models.Comment.post_id == models.Post.id)
        .group_by(models.Post.id, models.User.id)
    )

    if sort_by == "popular":
        query = query.order_by(desc(like_count), desc(models.Post.created_at))
    else:
        query = query.order_by(desc(models.Post.created_at))

    rows = db.execute(query).all()
    posts = [schemas.PostRead.model_validate({**row._mapping, "recent_comments": []}) for row in rows]

    if not posts:
        return posts

    post_ids = [post.id for post in posts]
    comment_rows = db.execute(
        select(
            models.Comment.id,
            models.Comment.body,
            models.Comment.created_at,
            models.Comment.user_id,
            models.Comment.post_id,
            models.User.username,
            models.User.display_name,
        )
        .join(models.User, models.User.id == models.Comment.user_id)
        .where(models.Comment.post_id.in_(post_ids))
        .order_by(models.Comment.created_at.desc())
    ).all()

    grouped: dict[int, list[schemas.CommentRead]] = {}
    for row in comment_rows:
        preview = schemas.CommentRead.model_validate(row._mapping)
        grouped.setdefault(preview.post_id, [])
        if len(grouped[preview.post_id]) < 2:
            grouped[preview.post_id].append(preview)

    for post in posts:
        post.recent_comments = list(reversed(grouped.get(post.id, [])))

    return posts


def toggle_like(db: Session, post_id: int, user_id: int) -> schemas.LikeToggleResponse:
    existing = db.scalar(
        select(models.Like).where(models.Like.post_id == post_id, models.Like.user_id == user_id)
    )
    liked = False
    if existing:
        db.delete(existing)
        db.commit()
    else:
        db.add(models.Like(post_id=post_id, user_id=user_id))
        try:
            db.commit()
            liked = True
        except IntegrityError:
            db.rollback()

    count = db.scalar(select(func.count(models.Like.id)).where(models.Like.post_id == post_id)) or 0
    return schemas.LikeToggleResponse(post_id=post_id, liked=liked, like_count=count)


def create_comment(db: Session, post_id: int, payload: schemas.CommentCreate) -> models.Comment:
    comment = models.Comment(post_id=post_id, **payload.model_dump())
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


def list_post_comments(db: Session, post_id: int) -> list[schemas.CommentRead]:
    query = (
        select(
            models.Comment.id,
            models.Comment.body,
            models.Comment.created_at,
            models.Comment.user_id,
            models.Comment.post_id,
            models.User.username,
            models.User.display_name,
        )
        .join(models.User, models.User.id == models.Comment.user_id)
        .where(models.Comment.post_id == post_id)
        .order_by(models.Comment.created_at.asc())
    )
    rows = db.execute(query).all()
    return [schemas.CommentRead.model_validate(row._mapping) for row in rows]


def list_user_posts(db: Session, username: str) -> list[schemas.PostRead]:
    user = get_user_by_username(db, username)
    if not user:
        return []
    return [
        post
        for post in list_feed(db, sort_by="recent")
        if post.username == username
    ]


def get_user_profile(db: Session, username: str) -> schemas.UserProfileResponse | None:
    user = get_user_by_username(db, username)
    if not user:
        return None

    stats_query = select(
        func.count(func.distinct(models.Post.id)).label("post_count"),
        func.count(func.distinct(models.Like.id)).label("total_likes_received"),
        func.count(func.distinct(models.Comment.id)).label("total_comments_received"),
    ).select_from(models.User)
    stats_query = stats_query.outerjoin(models.Post, models.Post.user_id == models.User.id)
    stats_query = stats_query.outerjoin(models.Like, models.Like.post_id == models.Post.id)
    stats_query = stats_query.outerjoin(models.Comment, models.Comment.post_id == models.Post.id)
    stats_query = stats_query.where(models.User.id == user.id).group_by(models.User.id)

    stats_row = db.execute(stats_query).one_or_none()
    stats = schemas.UserProfileStats(
        post_count=0,
        total_likes_received=0,
        total_comments_received=0,
    )
    if stats_row:
        stats = schemas.UserProfileStats.model_validate(stats_row._mapping)

    return schemas.UserProfileResponse(
        user=schemas.UserRead.model_validate(user),
        stats=stats,
        recent_posts=list_user_posts(db, username)[:6],
    )
