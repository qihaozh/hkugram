from pathlib import Path
from uuid import uuid4

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.config import get_settings
from app.database import Base, engine, get_db
from app.query_engine import (
    SCHEMA_CONTEXT,
    execute_read_only_sql,
    list_supported_questions,
    text_to_sql,
)

settings = get_settings()
app = FastAPI(title=settings.app_name)
uploads_dir = Path(__file__).resolve().parents[1] / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)


app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/query/schema")
def get_query_schema() -> dict[str, object]:
    return {
        "tables": SCHEMA_CONTEXT,
        "supported_questions": list_supported_questions(),
    }


@app.post("/users", response_model=schemas.UserRead, status_code=201)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_user(db, payload)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username already exists") from exc


@app.post("/auth/login", response_model=schemas.UserRead)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, payload.username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/users", response_model=list[schemas.UserRead])
def get_users(db: Session = Depends(get_db)):
    return crud.list_users(db)


@app.get("/users/{username}", response_model=schemas.UserProfileResponse)
def get_user_profile(username: str, db: Session = Depends(get_db)):
    profile = crud.get_user_profile(db, username)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@app.get("/feed", response_model=list[schemas.PostRead])
def get_feed(
    sort_by: str = Query(default="recent", pattern="^(recent|popular)$"),
    db: Session = Depends(get_db),
):
    return crud.list_feed(db, sort_by=sort_by)


@app.post("/posts", status_code=201)
def create_post(payload: schemas.PostCreate, db: Session = Depends(get_db)):
    user = db.get(models.User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    post = crud.create_post(db, payload)
    return {"id": post.id}


@app.post("/posts/upload", status_code=201)
async def create_uploaded_post(
    user_id: int = Form(...),
    description: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    suffix = Path(image.filename or "upload").suffix or ".jpg"
    filename = f"{uuid4().hex}{suffix}"
    file_path = uploads_dir / filename
    content = await image.read()
    file_path.write_bytes(content)

    post = crud.create_post(
        db,
        schemas.PostCreate(
            user_id=user_id,
            description=description,
            image_url=f"http://127.0.0.1:8000/uploads/{filename}",
        ),
    )
    return {"id": post.id, "image_url": post.image_url}


@app.post("/posts/{post_id}/like", response_model=schemas.LikeToggleResponse)
def toggle_like(post_id: int, user_id: int, db: Session = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.toggle_like(db, post_id=post_id, user_id=user_id)


@app.post("/posts/{post_id}/comments", response_model=schemas.CommentRead, status_code=201)
def create_comment(post_id: int, payload: schemas.CommentCreate, db: Session = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    user = db.get(models.User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_comment(db, post_id=post_id, payload=payload)


@app.get("/posts/{post_id}/comments", response_model=list[schemas.CommentRead])
def get_post_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return crud.list_post_comments(db, post_id)


@app.get("/users/{username}/posts", response_model=list[schemas.PostRead])
def get_user_posts(username: str, db: Session = Depends(get_db)):
    return crud.list_user_posts(db, username)


@app.post("/query/sql", response_model=schemas.SqlQueryResponse)
def run_sql_query(payload: schemas.SqlQueryRequest, db: Session = Depends(get_db)):
    try:
        return execute_read_only_sql(db, payload.sql, payload.params)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/query/text-to-sql", response_model=schemas.TextToSqlResponse)
def run_text_to_sql_query(payload: schemas.TextToSqlRequest, db: Session = Depends(get_db)):
    try:
        generated = text_to_sql(payload.prompt)
        result = execute_read_only_sql(db, generated.sql, generated.params)
        return schemas.TextToSqlResponse(
            title=generated.title,
            sql=" ".join(generated.sql.split()),
            params=generated.params,
            columns=result["columns"],
            row_count=result["row_count"],
            rows=result["rows"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
