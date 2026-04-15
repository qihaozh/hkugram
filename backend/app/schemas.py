from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=100)
    display_name: str = Field(min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=255)


class UserLogin(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6, max_length=100)


class UserUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    bio: str | None = Field(default=None, max_length=255)
    password: str | None = Field(default=None, min_length=6, max_length=100)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: str
    bio: str | None
    created_at: datetime


class PostCreate(BaseModel):
    user_id: int
    description: str = Field(min_length=1, max_length=2000)
    image_url: HttpUrl


class PostRead(BaseModel):
    id: int
    description: str
    image_url: str
    created_at: datetime
    like_count: int
    comment_count: int
    username: str
    display_name: str
    recent_comments: list["CommentRead"] = []


class CommentCreate(BaseModel):
    user_id: int
    body: str = Field(min_length=1, max_length=1000)


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    body: str
    created_at: datetime
    user_id: int
    post_id: int
    username: str | None = None
    display_name: str | None = None


class LikeToggleResponse(BaseModel):
    post_id: int
    liked: bool
    like_count: int


class SqlQueryRequest(BaseModel):
    sql: str = Field(min_length=1, max_length=5000)
    params: dict[str, str | int | float] | None = None


class SqlQueryResponse(BaseModel):
    columns: list[str]
    row_count: int
    rows: list[dict]


class TextToSqlRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=300)


class TextToSqlResponse(BaseModel):
    title: str
    sql: str
    params: dict
    columns: list[str]
    row_count: int
    rows: list[dict]


class UserProfileStats(BaseModel):
    post_count: int
    total_likes_received: int
    total_comments_received: int


class UserProfileResponse(BaseModel):
    user: UserRead
    stats: UserProfileStats
    recent_posts: list[PostRead]
