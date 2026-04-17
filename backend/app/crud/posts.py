from sqlalchemy import Select, desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models, schemas
from app.crud.users import get_user_by_username


def create_post(db: Session, payload: schemas.PostCreate) -> models.Post:
    post = models.Post(**payload.model_dump(mode="json"))
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


def list_feed(
    db: Session,
    sort_by: str = "recent",
    category: str | None = None,
    limit: int = 9,
    offset: int = 0,
) -> list[schemas.PostRead]:
    like_count = func.count(func.distinct(models.Like.id)).label("like_count")
    comment_count = func.count(func.distinct(models.Comment.id)).label("comment_count")

    query: Select = (
        select(
            models.Post.id,
            models.Post.category,
            models.Post.description,
            models.Post.image_url,
            models.Post.image_width,
            models.Post.image_height,
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

    if category:
        query = query.where(models.Post.category == category)

    if sort_by == "popular":
        query = query.order_by(desc(like_count), desc(models.Post.created_at))
    else:
        query = query.order_by(desc(models.Post.created_at))

    query = query.limit(limit).offset(offset)

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
    return set_like(db, post_id=post_id, user_id=user_id, liked=existing is None)


def set_like(db: Session, post_id: int, user_id: int, liked: bool) -> schemas.LikeToggleResponse:
    existing = db.scalar(
        select(models.Like).where(models.Like.post_id == post_id, models.Like.user_id == user_id)
    )
    current_liked = existing is not None

    if liked:
        if not current_liked:
            db.add(models.Like(post_id=post_id, user_id=user_id))
            try:
                db.flush()
                # Create notification
                post = db.scalar(select(models.Post).where(models.Post.id == post_id))
                if post and post.user_id != user_id:
                    db.add(models.Notification(
                        user_id=post.user_id,
                        actor_id=user_id,
                        type="like",
                        post_id=post_id
                    ))
                db.commit()
            except IntegrityError:
                db.rollback()
        result_liked = True
    else:
        if existing:
            db.delete(existing)
            db.commit()
        result_liked = False

    count = db.scalar(select(func.count(models.Like.id)).where(models.Like.post_id == post_id)) or 0
    return schemas.LikeToggleResponse(post_id=post_id, liked=result_liked, like_count=count)


def create_comment(db: Session, post_id: int, payload: schemas.CommentCreate) -> models.Comment:
    comment = models.Comment(post_id=post_id, **payload.model_dump())
    db.add(comment)
    db.flush()

    # Create notification
    post = db.scalar(select(models.Post).where(models.Post.id == post_id))
    if post and post.user_id != payload.user_id:
        db.add(models.Notification(
            user_id=post.user_id,
            actor_id=payload.user_id,
            type="comment",
            post_id=post_id
        ))

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
    return [post for post in list_feed(db, sort_by="recent") if post.username == username]


def get_post_detail(db: Session, post_id: int) -> schemas.PostRead | None:
    for post in list_feed(db, sort_by="recent"):
        if post.id == post_id:
            return post
    return None


def record_post_view(db: Session, user_id: int, post_id: int) -> None:
    existing = db.scalar(
        select(models.ViewHistory).where(
            models.ViewHistory.user_id == user_id,
            models.ViewHistory.post_id == post_id,
        )
    )
    if existing:
        db.delete(existing)
        db.flush()

    db.add(models.ViewHistory(user_id=user_id, post_id=post_id))
    db.commit()
