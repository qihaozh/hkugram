from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    bio: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    posts: Mapped[list["Post"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    likes: Mapped[list["Like"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    following: Mapped[list["Follow"]] = relationship(
        foreign_keys="Follow.follower_id",
        back_populates="follower",
        cascade="all, delete-orphan",
    )
    followers: Mapped[list["Follow"]] = relationship(
        foreign_keys="Follow.followee_id",
        back_populates="followee",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        foreign_keys="Notification.user_id",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, server_default="Inspiration")
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    image_width: Mapped[int | None] = mapped_column(nullable=True)
    image_height: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    user: Mapped["User"] = relationship(back_populates="posts")
    likes: Mapped[list["Like"]] = relationship(back_populates="post", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="post",
        cascade="all, delete-orphan",
    )


class Like(Base):
    __tablename__ = "likes"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_like_user_post"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="likes")
    post: Mapped["Post"] = relationship(back_populates="likes")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="comments")
    post: Mapped["Post"] = relationship(back_populates="comments")


class ViewHistory(Base):
    __tablename__ = "view_history"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_view_history_user_post"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    viewed_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )


class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "followee_id", name="uq_follow_follower_followee"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    follower_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    followee_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    follower: Mapped["User"] = relationship(foreign_keys=[follower_id], back_populates="following")
    followee: Mapped["User"] = relationship(foreign_keys=[followee_id], back_populates="followers")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    actor_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    post_id: Mapped[int | None] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), nullable=True)
    is_read: Mapped[bool] = mapped_column(default=False, server_default=text("'false'"), nullable=False)
    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True
    )

    user: Mapped["User"] = relationship(foreign_keys=[user_id], back_populates="notifications")
    actor: Mapped["User"] = relationship(foreign_keys=[actor_id])
    post: Mapped["Post"] = relationship()

