from io import BytesIO
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from PIL import Image


def get_uploads_dir() -> Path:
    uploads_dir = Path(__file__).resolve().parents[2] / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    return uploads_dir


async def save_uploaded_image(image: UploadFile) -> tuple[str, int, int]:
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    suffix = Path(image.filename or "upload").suffix or ".jpg"
    filename = f"{uuid4().hex}{suffix}"
    file_path = get_uploads_dir() / filename
    content = await image.read()

    try:
        with Image.open(BytesIO(content)) as uploaded:
            width, height = uploaded.size
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Uploaded image could not be processed") from exc

    if width <= 0 or height <= 0:
        raise HTTPException(status_code=400, detail="Uploaded image has invalid dimensions")

    file_path.write_bytes(content)
    return filename, width, height
