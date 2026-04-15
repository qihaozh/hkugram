from sqlalchemy import inspect, text

from app.database import Base, engine
from app.security import hash_password


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_password_schema()
    ensure_post_schema()
    ensure_follow_schema()


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
    if "category" in post_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE posts ADD COLUMN category VARCHAR(50) NULL"))
        connection.execute(text("UPDATE posts SET category = 'Inspiration' WHERE category IS NULL"))
        try:
            connection.execute(text("ALTER TABLE posts MODIFY COLUMN category VARCHAR(50) NOT NULL"))
        except Exception:
            pass


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
