from app.crud.analytics import get_analytics_overview
from app.crud.posts import (
    create_comment,
    create_post,
    get_post_detail,
    list_feed,
    list_post_comments,
    list_user_posts,
    record_post_view,
    toggle_like,
)
from app.crud.users import (
    authenticate_user,
    create_user,
    get_user_by_username,
    get_user_profile as _get_user_profile,
    list_user_history,
    list_users,
    update_user,
)


def get_user_profile(db, username):
    recent_posts = list_user_posts(db, username)
    return _get_user_profile(db, username, recent_posts)

