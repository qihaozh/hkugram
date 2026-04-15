from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys

from sqlalchemy import select

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.database import SessionLocal
from app.models import Comment, Like, Post, User
from app.security import hash_password


USER_SEEDS = [
    {
        "username": "tianxing",
        "password": "tianxing123",
        "display_name": "Tianxing",
        "bio": "Night photography enthusiast",
    },
    {
        "username": "amelia",
        "password": "amelia123",
        "display_name": "Amelia Hart",
        "bio": "Visual storyteller with a love for cinema lighting",
    },
    {
        "username": "sam",
        "password": "sam123456",
        "display_name": "Sam",
        "bio": "Capturing campus moments",
    },
    {
        "username": "noah",
        "password": "noah123",
        "display_name": "Noah",
        "bio": "Street frames, long shadows, and city corners",
    },
    {
        "username": "luna",
        "password": "luna123",
        "display_name": "Luna",
        "bio": "Cafe notebooks and soft neon evenings",
    },
]


POST_SEEDS = [
    {
        "username": "tianxing",
        "category": "Photography",
        "description": "Golden lights over the harbor after class.",
        "image_url": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee",
        "image_width": 1600,
        "image_height": 1067,
        "offset": {"days": 3, "hours": 2},
    },
    {
        "username": "amelia",
        "category": "Cafe",
        "description": "A quiet table, good coffee, and project planning.",
        "image_url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085",
        "image_width": 1600,
        "image_height": 1067,
        "offset": {"days": 1, "hours": 4},
    },
    {
        "username": "sam",
        "category": "Inspiration",
        "description": "Studio textures and geometric shadows.",
        "image_url": "https://images.unsplash.com/photo-1517048676732-d65bc937f952",
        "image_width": 1600,
        "image_height": 900,
        "offset": {"hours": 5},
    },
    {
        "username": "amelia",
        "category": "Nightlife",
        "description": "Bronze reflections in the arcade right before midnight.",
        "image_url": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518",
        "image_width": 1200,
        "image_height": 1500,
        "offset": {"minutes": 35},
    },
    {
        "username": "noah",
        "category": "Travel",
        "description": "A road cut straight through red stone and silence.",
        "image_url": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429",
        "image_width": 1600,
        "image_height": 1067,
        "offset": {"days": 4, "hours": 1},
    },
    {
        "username": "luna",
        "category": "Cafe",
        "description": "Late afternoon cups lined up like a brass orchestra.",
        "image_url": "https://images.unsplash.com/photo-1509042239860-f550ce710b93",
        "image_width": 1600,
        "image_height": 1067,
        "offset": {"days": 2, "hours": 3},
    },
    {
        "username": "tianxing",
        "category": "Campus",
        "description": "The library corridor felt like a movie set after rain.",
        "image_url": "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d",
        "image_width": 1600,
        "image_height": 1067,
        "offset": {"days": 2, "hours": 8},
    },
    {
        "username": "sam",
        "category": "Fashion",
        "description": "Sharp tailoring, polished shoes, and a deliberate pause.",
        "image_url": "https://images.unsplash.com/photo-1496747611176-843222e1e57c",
        "image_width": 1200,
        "image_height": 1500,
        "offset": {"days": 5, "hours": 5},
    },
    {
        "username": "amelia",
        "category": "Inspiration",
        "description": "Symmetry, velvet shadows, and that old-theater hush.",
        "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
        "image_width": 1200,
        "image_height": 1500,
        "offset": {"days": 6, "hours": 2},
    },
    {
        "username": "luna",
        "category": "Nightlife",
        "description": "Neon reflections cutting across the tram window.",
        "image_url": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
        "image_width": 1600,
        "image_height": 900,
        "offset": {"days": 1, "hours": 1},
    },
    {
        "username": "noah",
        "category": "Photography",
        "description": "A portrait framed like an old poster in a dark hall.",
        "image_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e",
        "image_width": 1200,
        "image_height": 1500,
        "offset": {"hours": 10},
    },
    {
        "username": "tianxing",
        "category": "Travel",
        "description": "Stone, dust, and one bright strip of road ahead.",
        "image_url": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?sig=2",
        "image_width": 1600,
        "image_height": 1067,
        "offset": {"days": 7, "hours": 4},
    },
]


COMMENT_SEEDS = [
    ("sam", "Golden lights over the harbor after class.", "The reflections are excellent.", {"days": 2, "hours": 20}),
    ("amelia", "Golden lights over the harbor after class.", "Looks like an old cinema poster.", {"days": 2, "hours": 18}),
    ("tianxing", "A quiet table, good coffee, and project planning.", "Coffee and database work is a strong combination.", {"days": 1, "hours": 2}),
    ("amelia", "Studio textures and geometric shadows.", "These shadows feel very Art Deco.", {"hours": 3}),
    ("sam", "Bronze reflections in the arcade right before midnight.", "This one should sit at the top of recent.", {"minutes": 22}),
    ("luna", "A road cut straight through red stone and silence.", "The framing makes the valley feel ceremonial.", {"days": 3, "hours": 20}),
    ("tianxing", "Late afternoon cups lined up like a brass orchestra.", "This belongs on the cafe filter front page.", {"days": 1, "hours": 22}),
    ("noah", "The library corridor felt like a movie set after rain.", "The vanishing point is doing a lot here.", {"days": 2, "hours": 5}),
    ("amelia", "Sharp tailoring, polished shoes, and a deliberate pause.", "The silhouette reads immediately even at feed size.", {"days": 4, "hours": 21}),
    ("sam", "Neon reflections cutting across the tram window.", "This one carries the whole nightlife mood.", {"hours": 18}),
]


LIKE_SEEDS = [
    ("amelia", "Golden lights over the harbor after class."),
    ("sam", "Golden lights over the harbor after class."),
    ("tianxing", "Golden lights over the harbor after class."),
    ("tianxing", "A quiet table, good coffee, and project planning."),
    ("tianxing", "Studio textures and geometric shadows."),
    ("amelia", "Studio textures and geometric shadows."),
    ("sam", "Bronze reflections in the arcade right before midnight."),
    ("amelia", "A road cut straight through red stone and silence."),
    ("tianxing", "A road cut straight through red stone and silence."),
    ("sam", "Late afternoon cups lined up like a brass orchestra."),
    ("luna", "The library corridor felt like a movie set after rain."),
    ("noah", "Sharp tailoring, polished shoes, and a deliberate pause."),
    ("amelia", "Symmetry, velvet shadows, and that old-theater hush."),
    ("sam", "Neon reflections cutting across the tram window."),
    ("tianxing", "A portrait framed like an old poster in a dark hall."),
]


def seed() -> None:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)

        users_by_username = {user.username: user for user in db.scalars(select(User)).all()}
        for user_seed in USER_SEEDS:
            user = users_by_username.get(user_seed["username"])
            if user:
                continue
            user = User(
                username=user_seed["username"],
                password_hash=hash_password(user_seed["password"]),
                display_name=user_seed["display_name"],
                bio=user_seed["bio"],
            )
            db.add(user)
            db.flush()
            users_by_username[user.username] = user

        posts_by_description = {post.description: post for post in db.scalars(select(Post)).all()}
        for post_seed in POST_SEEDS:
            if post_seed["description"] in posts_by_description:
                continue
            post = Post(
                user_id=users_by_username[post_seed["username"]].id,
                category=post_seed["category"],
                description=post_seed["description"],
                image_url=post_seed["image_url"],
                image_width=post_seed.get("image_width"),
                image_height=post_seed.get("image_height"),
                created_at=now - timedelta(**post_seed["offset"]),
            )
            db.add(post)
            db.flush()
            posts_by_description[post.description] = post
        for post_seed in POST_SEEDS:
            post = posts_by_description[post_seed["description"]]
            if post.image_width and post.image_height:
                continue
            post.image_width = post_seed.get("image_width")
            post.image_height = post_seed.get("image_height")

        existing_likes = {
            (like.user_id, like.post_id)
            for like in db.scalars(select(Like)).all()
        }
        for username, description in LIKE_SEEDS:
            key = (users_by_username[username].id, posts_by_description[description].id)
            if key in existing_likes:
                continue
            db.add(Like(user_id=key[0], post_id=key[1]))
            existing_likes.add(key)

        existing_comments = {
            (comment.user_id, comment.post_id, comment.body)
            for comment in db.scalars(select(Comment)).all()
        }
        for username, description, body, offset in COMMENT_SEEDS:
            key = (users_by_username[username].id, posts_by_description[description].id, body)
            if key in existing_comments:
                continue
            db.add(
                Comment(
                    user_id=key[0],
                    post_id=key[1],
                    body=body,
                    created_at=now - timedelta(**offset),
                )
            )
            existing_comments.add(key)

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
