from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.database import get_db

router = APIRouter(tags=["users"])


@router.post("/users", response_model=schemas.UserRead, status_code=201)
def create_user(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_user(db, payload)
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username already exists") from exc


@router.get("/users", response_model=list[schemas.UserRead])
def get_users(db: Session = Depends(get_db)):
    return crud.list_users(db)


@router.get("/users/{username}", response_model=schemas.UserProfileResponse)
def get_user_profile(
    username: str,
    viewer_user_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    profile = crud.get_user_profile(db, username, viewer_user_id=viewer_user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@router.put("/users/{username}", response_model=schemas.UserRead)
def update_user(username: str, payload: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = crud.update_user(db, username, payload)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users/{username}/posts", response_model=list[schemas.PostRead])
def get_user_posts(username: str, db: Session = Depends(get_db)):
    return crud.list_user_posts(db, username)


@router.get("/users/{username}/history", response_model=list[schemas.ViewHistoryRead])
def get_user_history(username: str, db: Session = Depends(get_db)):
    user = crud.get_user_by_username(db, username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.list_user_history(db, username)


@router.post("/users/{username}/follow", response_model=schemas.FollowToggleResponse)
def toggle_follow(username: str, follower_user_id: int = Query(...), db: Session = Depends(get_db)):
    follower = db.get(models.User, follower_user_id)
    if not follower:
        raise HTTPException(status_code=404, detail="User not found")
    try:
        result = crud.toggle_follow(db, follower_user_id, username)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return result
