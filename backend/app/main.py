from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import (
    agent_router,
    analytics_router,
    auth_router,
    posts_router,
    query_router,
    users_router,
)
from app.config import get_settings
from app.services.bootstrap import initialize_database
from app.services.uploads import get_uploads_dir

settings = get_settings()
app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    initialize_database()


app.mount("/uploads", StaticFiles(directory=get_uploads_dir()), name="uploads")


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(posts_router)
app.include_router(analytics_router)
app.include_router(query_router)
app.include_router(agent_router)
