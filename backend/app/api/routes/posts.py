from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db
from app.services.uploads import save_uploaded_image

router = APIRouter(tags=["posts"])


@router.get("/feed", response_model=list[schemas.PostRead])
def get_feed(
    sort_by: str = Query(default="recent", pattern="^(recent|popular)$"),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return crud.list_feed(db, sort_by=sort_by, category=category)


@router.post("/posts", status_code=201)
def create_post(payload: schemas.PostCreate, db: Session = Depends(get_db)):
    user = db.get(models.User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    post = crud.create_post(db, payload)
    return {"id": post.id}


@router.get("/posts/{post_id}", response_model=schemas.PostRead)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = crud.get_post_detail(db, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/posts/upload", status_code=201)
async def create_uploaded_post(
    user_id: int = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    filename, image_width, image_height = await save_uploaded_image(image)
    post = crud.create_post(
        db,
        schemas.PostCreate(
            user_id=user_id,
            category=category,
            description=description,
            image_url=f"http://127.0.0.1:8000/uploads/{filename}",
            image_width=image_width,
            image_height=image_height,
        ),
    )
    return {
        "id": post.id,
        "image_url": post.image_url,
        "image_width": post.image_width,
        "image_height": post.image_height,
    }


@router.post("/posts/{post_id}/like", response_model=schemas.LikeToggleResponse)
def toggle_like(post_id: int, user_id: int, db: Session = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.toggle_like(db, post_id=post_id, user_id=user_id)


@router.post("/posts/{post_id}/comments", response_model=schemas.CommentRead, status_code=201)
def create_comment(post_id: int, payload: schemas.CommentCreate, db: Session = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    user = db.get(models.User, payload.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_comment(db, post_id=post_id, payload=payload)


@router.get("/posts/{post_id}/comments", response_model=list[schemas.CommentRead])
def get_post_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return crud.list_post_comments(db, post_id)


@router.post("/posts/{post_id}/views", status_code=204)
def record_post_view(post_id: int, user_id: int, db: Session = Depends(get_db)):
    post = db.get(models.Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    crud.record_post_view(db, user_id=user_id, post_id=post_id)
