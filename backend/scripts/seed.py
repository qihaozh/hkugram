from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Comment, Like, Post, User
from app.security import hash_password


def seed() -> None:
    db = SessionLocal()
    try:
        existing = db.scalar(select(User.id).limit(1))
        if existing:
            return

        users = [
            User(
                username="tianxing",
                password_hash=hash_password("tianxing123"),
                display_name="Tianxing",
                bio="Night photography enthusiast",
            ),
            User(
                username="amelia",
                password_hash=hash_password("amelia123"),
                display_name="Amelia",
                bio="Visual storyteller",
            ),
            User(
                username="sam",
                password_hash=hash_password("sam123456"),
                display_name="Sam",
                bio="Capturing campus moments",
            ),
        ]
        db.add_all(users)
        db.flush()

        now = datetime.now(timezone.utc)

        posts = [
            Post(
                user_id=users[0].id,
                description="Golden lights over the harbor after class.",
                image_url="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
                created_at=now - timedelta(days=3, hours=2),
            ),
            Post(
                user_id=users[1].id,
                description="A quiet table, good coffee, and project planning.",
                image_url="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
                created_at=now - timedelta(days=1, hours=4),
            ),
            Post(
                user_id=users[2].id,
                description="Studio textures and geometric shadows.",
                image_url="https://images.unsplash.com/photo-1517048676732-d65bc937f952",
                created_at=now - timedelta(hours=5),
            ),
            Post(
                user_id=users[1].id,
                description="Bronze reflections in the arcade right before midnight.",
                image_url="https://images.unsplash.com/photo-1521572267360-ee0c2909d518",
                created_at=now - timedelta(minutes=35),
            ),
        ]
        db.add_all(posts)
        db.flush()

        db.add_all(
            [
                Like(user_id=users[1].id, post_id=posts[0].id),
                Like(user_id=users[2].id, post_id=posts[0].id),
                Like(user_id=users[0].id, post_id=posts[0].id),
                Like(user_id=users[0].id, post_id=posts[1].id),
                Like(user_id=users[0].id, post_id=posts[2].id),
                Like(user_id=users[1].id, post_id=posts[2].id),
                Like(user_id=users[2].id, post_id=posts[3].id),
                Comment(
                    user_id=users[2].id,
                    post_id=posts[0].id,
                    body="The reflections are excellent.",
                    created_at=now - timedelta(days=2, hours=20),
                ),
                Comment(
                    user_id=users[1].id,
                    post_id=posts[0].id,
                    body="Looks like an old cinema poster.",
                    created_at=now - timedelta(days=2, hours=18),
                ),
                Comment(
                    user_id=users[0].id,
                    post_id=posts[1].id,
                    body="Coffee and database work is a strong combination.",
                    created_at=now - timedelta(days=1, hours=2),
                ),
                Comment(
                    user_id=users[1].id,
                    post_id=posts[2].id,
                    body="These shadows feel very Art Deco.",
                    created_at=now - timedelta(hours=3),
                ),
                Comment(
                    user_id=users[2].id,
                    post_id=posts[3].id,
                    body="This one should sit at the top of recent.",
                    created_at=now - timedelta(minutes=22),
                ),
            ]
        )
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
