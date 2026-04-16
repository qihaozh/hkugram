from pathlib import Path

from sqlalchemy import inspect, text
from PIL import Image

from app.database import Base, engine
from app.security import hash_password


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_password_schema()
    ensure_post_schema()
    ensure_follow_schema()
    ensure_search_indexes()
    backfill_local_post_dimensions()


def ensure_password_schema() -> None:
    inspector = inspect(engine)
    user_columns = {column["name"] for column in inspector.get_columns("users")}
    if "password_hash" in user_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL"))
        connection.execute(text("UPDATE users SET password_hash = :password_hash"), {"password_hash": ""})

        rows = connection.execute(text("SELECT id, username FROM users")).mappings().all()
        for row in rows:
            connection.execute(
                text("UPDATE users SET password_hash = :password_hash WHERE id = :user_id"),
                {
                    "password_hash": hash_password(row["username"] + "123"),
                    "user_id": row["id"],
                },
            )

        connection.execute(text("ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL"))


def ensure_post_schema() -> None:
    inspector = inspect(engine)
    post_columns = {column["name"] for column in inspector.get_columns("posts")}

    with engine.begin() as connection:
        if "category" not in post_columns:
            connection.execute(text("ALTER TABLE posts ADD COLUMN category VARCHAR(50) NULL"))
            connection.execute(text("UPDATE posts SET category = 'Inspiration' WHERE category IS NULL"))
            try:
                connection.execute(text("ALTER TABLE posts MODIFY COLUMN category VARCHAR(50) NOT NULL"))
            except Exception:
                pass

        if "image_width" not in post_columns:
            connection.execute(text("ALTER TABLE posts ADD COLUMN image_width INTEGER NULL"))

        if "image_height" not in post_columns:
            connection.execute(text("ALTER TABLE posts ADD COLUMN image_height INTEGER NULL"))


def ensure_follow_schema() -> None:
    inspector = inspect(engine)
    if "follows" in inspector.get_table_names():
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE follows (
                    id INTEGER PRIMARY KEY AUTO_INCREMENT,
                    follower_id INTEGER NOT NULL,
                    followee_id INTEGER NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_follow_follower_followee UNIQUE (follower_id, followee_id),
                    CONSTRAINT fk_follows_follower FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
                    CONSTRAINT fk_follows_followee FOREIGN KEY (followee_id) REFERENCES users(id) ON DELETE CASCADE
                )
                """
            )
        )


def ensure_search_indexes() -> None:
    if engine.dialect.name != "mysql":
        return

    index_specs = [
        ("posts", "idx_posts_fulltext_search", "description, category"),
        ("users", "idx_users_fulltext_search", "username, display_name, bio"),
        ("comments", "idx_comments_fulltext_search", "body"),
    ]

    with engine.begin() as connection:
        for table_name, index_name, columns in index_specs:
            existing = connection.execute(
                text(
                    """
                    SELECT COUNT(*) AS index_count
                    FROM information_schema.statistics
                    WHERE table_schema = DATABASE()
                      AND table_name = :table_name
                      AND index_name = :index_name
                    """
                ),
                {"table_name": table_name, "index_name": index_name},
            ).scalar()
            if existing:
                continue

            try:
                connection.execute(text(f"ALTER TABLE {table_name} ADD FULLTEXT INDEX {index_name} ({columns})"))
            except Exception:
                # Search still works through the LIKE fallback if a local DB cannot create FULLTEXT indexes.
                continue


def backfill_local_post_dimensions() -> None:
    uploads_dir = Path(__file__).resolve().parents[2] / "uploads"
    if not uploads_dir.exists():
        return

    with engine.begin() as connection:
        rows = connection.execute(
            text(
                """
                SELECT id, image_url
                FROM posts
                WHERE (image_width IS NULL OR image_height IS NULL)
                """
            )
        ).mappings().all()

        for row in rows:
            image_url = row["image_url"] or ""
            marker = "/uploads/"
            if marker not in image_url:
                continue

            filename = image_url.split(marker, 1)[1].split("?", 1)[0]
            file_path = uploads_dir / filename
            if not file_path.exists():
                continue

            try:
                with Image.open(file_path) as uploaded:
                    width, height = uploaded.size
            except Exception:
                continue

            if width <= 0 or height <= 0:
                continue

            connection.execute(
                text(
                    """
                    UPDATE posts
                    SET image_width = :image_width, image_height = :image_height
                    WHERE id = :post_id
                    """
                ),
                {
                    "image_width": width,
                    "image_height": height,
                    "post_id": row["id"],
                },
            )
