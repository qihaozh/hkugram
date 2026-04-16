from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session


READ_ONLY_SQL_PATTERN = re.compile(r"^\s*select\b", re.IGNORECASE | re.DOTALL)
BLOCKED_SQL_PATTERN = re.compile(
    r"\b(insert|update|delete|drop|alter|truncate|create|replace|grant|revoke)\b|;",
    re.IGNORECASE,
)


SCHEMA_CONTEXT = {
    "users": ["id", "username", "display_name", "bio", "created_at"],
    "posts": ["id", "user_id", "category", "description", "image_url", "created_at"],
    "likes": ["id", "user_id", "post_id", "created_at"],
    "comments": ["id", "user_id", "post_id", "body", "created_at"],
    "view_history": ["id", "user_id", "post_id", "viewed_at"],
    "follows": ["id", "follower_id", "followee_id", "created_at"],
}


@dataclass(frozen=True)
class GeneratedQuery:
    title: str
    sql: str
    params: dict[str, Any]


SEARCH_SQL = """
    SELECT
        p.id,
        u.username,
        u.display_name,
        p.category,
        p.description,
        p.image_url,
        p.created_at,
        COUNT(DISTINCT l.id) AS like_count,
        COUNT(DISTINCT c.id) AS comment_count,
        (
            COALESCE(MATCH(p.description, p.category) AGAINST (:search_text IN NATURAL LANGUAGE MODE), 0)
            + COALESCE(MAX(MATCH(u.username, u.display_name, u.bio) AGAINST (:search_text IN NATURAL LANGUAGE MODE)), 0)
            + COALESCE(MAX(MATCH(c.body) AGAINST (:search_text IN NATURAL LANGUAGE MODE)), 0)
        ) AS relevance_score
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE
        MATCH(p.description, p.category) AGAINST (:search_text IN NATURAL LANGUAGE MODE)
        OR MATCH(u.username, u.display_name, u.bio) AGAINST (:search_text IN NATURAL LANGUAGE MODE)
        OR MATCH(c.body) AGAINST (:search_text IN NATURAL LANGUAGE MODE)
    GROUP BY p.id, u.id
    ORDER BY relevance_score DESC, p.created_at DESC
    LIMIT 10
"""

LIKE_SEARCH_SQL = """
    SELECT
        p.id,
        u.username,
        u.display_name,
        p.category,
        p.description,
        p.image_url,
        p.created_at,
        COUNT(DISTINCT l.id) AS like_count,
        COUNT(DISTINCT c.id) AS comment_count,
        (
            CASE WHEN LOWER(p.description) LIKE :like_term THEN 3 ELSE 0 END
            + CASE WHEN LOWER(p.category) LIKE :like_term THEN 2 ELSE 0 END
            + CASE WHEN LOWER(u.username) LIKE :like_term THEN 2 ELSE 0 END
            + CASE WHEN LOWER(u.display_name) LIKE :like_term THEN 2 ELSE 0 END
            + CASE WHEN MAX(LOWER(c.body) LIKE :like_term) THEN 1 ELSE 0 END
        ) AS relevance_score
    FROM posts p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN likes l ON l.post_id = p.id
    LEFT JOIN comments c ON c.post_id = p.id
    WHERE
        LOWER(p.description) LIKE :like_term
        OR LOWER(p.category) LIKE :like_term
        OR LOWER(u.username) LIKE :like_term
        OR LOWER(u.display_name) LIKE :like_term
        OR LOWER(c.body) LIKE :like_term
    GROUP BY p.id, u.id
    ORDER BY relevance_score DESC, p.created_at DESC
    LIMIT 10
"""


def list_supported_questions() -> list[dict[str, str]]:
    return [
        {
            "pattern": "most liked posts",
            "description": "Shows posts ordered by like count, newest first when tied.",
        },
        {
            "pattern": "most active users",
            "description": "Shows users ranked by number of posts authored.",
        },
        {
            "pattern": "recent posts",
            "description": "Shows the latest posts in the feed.",
        },
        {
            "pattern": "comments for post <id>",
            "description": "Shows comments for a specific post with usernames.",
        },
        {
            "pattern": "posts by user <username>",
            "description": "Shows posts from one user, newest first.",
        },
        {
            "pattern": "search posts about <keyword>",
            "description": "Searches post text, categories, creators, and comments with SQL LIKE.",
        },
        {
            "pattern": "most liked posts about <keyword>",
            "description": "Searches posts by keyword and ranks matching posts by like count.",
        },
    ]


def text_to_sql(prompt: str) -> GeneratedQuery:
    normalized = " ".join(prompt.lower().strip().split())

    if "most liked" in normalized or "top liked" in normalized:
        return GeneratedQuery(
            title="Most liked posts",
            sql="""
                SELECT
                    p.id,
                    u.username,
                    p.description,
                    p.image_url,
                    p.created_at,
                    COUNT(l.id) AS like_count
                FROM posts p
                JOIN users u ON u.id = p.user_id
                LEFT JOIN likes l ON l.post_id = p.id
                GROUP BY p.id, u.username
                ORDER BY like_count DESC, p.created_at DESC
                LIMIT 10
            """,
            params={},
        )

    if "most active users" in normalized or "top users" in normalized:
        return GeneratedQuery(
            title="Most active users",
            sql="""
                SELECT
                    u.id,
                    u.username,
                    u.display_name,
                    COUNT(p.id) AS post_count,
                    MAX(p.created_at) AS latest_post_at
                FROM users u
                LEFT JOIN posts p ON p.user_id = u.id
                GROUP BY u.id, u.username, u.display_name
                ORDER BY post_count DESC, latest_post_at DESC
                LIMIT 10
            """,
            params={},
        )

    if "recent posts" in normalized or "latest posts" in normalized:
        return GeneratedQuery(
            title="Recent posts",
            sql="""
                SELECT
                    p.id,
                    u.username,
                    p.description,
                    p.image_url,
                    p.created_at
                FROM posts p
                JOIN users u ON u.id = p.user_id
                ORDER BY p.created_at DESC
                LIMIT 10
            """,
            params={},
        )

    search_match = re.search(
        r"(?:search posts|find posts|posts|most liked posts|top liked posts|recent posts) (?:about|for|containing|with) ([a-zA-Z0-9_ -]+)",
        normalized,
    )
    if search_match:
        search_text = normalize_search_text(search_match.group(1))
        order_clause = "like_count DESC, p.created_at DESC" if "liked" in normalized else "p.created_at DESC"
        title_prefix = "Most liked matching posts" if "liked" in normalized else "Matching posts"
        return GeneratedQuery(
            title=f"{title_prefix}: {search_text}",
            sql=f"""
                SELECT
                    p.id,
                    u.username,
                    u.display_name,
                    p.category,
                    p.description,
                    p.image_url,
                    p.created_at,
                    COUNT(DISTINCT l.id) AS like_count,
                    COUNT(DISTINCT c.id) AS comment_count
                FROM posts p
                JOIN users u ON u.id = p.user_id
                LEFT JOIN likes l ON l.post_id = p.id
                LEFT JOIN comments c ON c.post_id = p.id
                WHERE
                    LOWER(p.description) LIKE :like_term
                    OR LOWER(p.category) LIKE :like_term
                    OR LOWER(u.username) LIKE :like_term
                    OR LOWER(u.display_name) LIKE :like_term
                    OR LOWER(c.body) LIKE :like_term
                GROUP BY p.id, u.id
                ORDER BY {order_clause}
                LIMIT 10
            """,
            params={"like_term": f"%{search_text.lower()}%"},
        )

    comment_match = re.search(r"comments for post (\d+)", normalized)
    if comment_match:
        post_id = int(comment_match.group(1))
        return GeneratedQuery(
            title=f"Comments for post {post_id}",
            sql="""
                SELECT
                    c.id,
                    u.username,
                    c.body,
                    c.created_at
                FROM comments c
                JOIN users u ON u.id = c.user_id
                WHERE c.post_id = :post_id
                ORDER BY c.created_at DESC
            """,
            params={"post_id": post_id},
        )

    user_match = re.search(r"posts by user ([a-zA-Z0-9_]+)", normalized)
    if user_match:
        username = user_match.group(1)
        return GeneratedQuery(
            title=f"Posts by user {username}",
            sql="""
                SELECT
                    p.id,
                    u.username,
                    p.description,
                    p.image_url,
                    p.created_at
                FROM posts p
                JOIN users u ON u.id = p.user_id
                WHERE u.username = :username
                ORDER BY p.created_at DESC
            """,
            params={"username": username},
        )

    raise ValueError(
        "Unsupported question. Try: most liked posts, most active users, recent posts, "
        "comments for post <id>, posts by user <username>, search posts about <keyword>, "
        "or most liked posts about <keyword>."
    )


def normalize_search_text(search_text: str) -> str:
    normalized = " ".join(search_text.strip().split())
    if not normalized:
        raise ValueError("Search text cannot be empty.")
    if len(normalized) > 120:
        raise ValueError("Search text must be 120 characters or fewer.")
    return normalized


def build_search_prompt(search_text: str) -> str:
    return f"search posts about {normalize_search_text(search_text)}"


def execute_read_only_sql(db: Session, sql: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    normalized_sql = sql.strip()
    if not READ_ONLY_SQL_PATTERN.match(normalized_sql) or BLOCKED_SQL_PATTERN.search(normalized_sql):
        raise ValueError("Only single-statement read-only SELECT queries are allowed.")

    result = db.execute(text(normalized_sql), params or {})
    rows = [dict(row._mapping) for row in result]
    return {
        "columns": list(result.keys()),
        "row_count": len(rows),
        "rows": rows,
    }


def execute_full_text_search(db: Session, search_text: str) -> tuple[str, dict[str, Any], bool]:
    normalized_search = normalize_search_text(search_text)
    try:
        result = execute_read_only_sql(db, SEARCH_SQL, {"search_text": normalized_search})
        return SEARCH_SQL, result, False
    except SQLAlchemyError:
        db.rollback()
        result = execute_read_only_sql(
            db,
            LIKE_SEARCH_SQL,
            {"like_term": f"%{normalized_search.lower()}%"},
        )
        return LIKE_SEARCH_SQL, result, True
