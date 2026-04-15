from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from app import models, schemas


def get_analytics_overview(db: Session) -> schemas.AnalyticsOverview:
    total_users = db.scalar(select(func.count(models.User.id))) or 0
    total_posts = db.scalar(select(func.count(models.Post.id))) or 0
    total_comments = db.scalar(select(func.count(models.Comment.id))) or 0
    total_likes = db.scalar(select(func.count(models.Like.id))) or 0

    post_like_count = func.count(func.distinct(models.Like.id)).label("like_count")
    post_comment_count = func.count(func.distinct(models.Comment.id)).label("comment_count")
    top_post_rows = db.execute(
        select(
            models.Post.id.label("post_id"),
            models.User.username,
            models.User.display_name,
            models.Post.description,
            models.Post.image_url,
            post_like_count,
            post_comment_count,
        )
        .join(models.User, models.User.id == models.Post.user_id)
        .outerjoin(models.Like, models.Like.post_id == models.Post.id)
        .outerjoin(models.Comment, models.Comment.post_id == models.Post.id)
        .group_by(models.Post.id, models.User.id)
        .order_by(desc(post_like_count), desc(post_comment_count), desc(models.Post.created_at))
        .limit(5)
    ).all()

    active_user_rows = db.execute(
        select(
            models.User.id.label("user_id"),
            models.User.username,
            models.User.display_name,
            func.count(func.distinct(models.Post.id)).label("post_count"),
            func.count(func.distinct(models.Like.id)).label("total_likes_received"),
            func.count(func.distinct(models.Comment.id)).label("total_comments_received"),
        )
        .outerjoin(models.Post, models.Post.user_id == models.User.id)
        .outerjoin(models.Like, models.Like.post_id == models.Post.id)
        .outerjoin(models.Comment, models.Comment.post_id == models.Post.id)
        .group_by(models.User.id)
        .order_by(
            desc(func.count(func.distinct(models.Post.id))),
            desc(func.count(func.distinct(models.Like.id))),
            models.User.username.asc(),
        )
        .limit(5)
    ).all()

    return schemas.AnalyticsOverview(
        total_users=total_users,
        total_posts=total_posts,
        total_comments=total_comments,
        total_likes=total_likes,
        top_posts=[schemas.TopPostStat.model_validate(row._mapping) for row in top_post_rows],
        active_users=[schemas.ActiveUserStat.model_validate(row._mapping) for row in active_user_rows],
    )

