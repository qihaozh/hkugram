import time
import sys
from pathlib import Path

from sqlalchemy.exc import OperationalError

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.database import engine
from app.services.bootstrap import initialize_database
from scripts.seed import seed


def wait_for_database(max_attempts: int = 30, delay_seconds: int = 2) -> None:
    for attempt in range(max_attempts):
        try:
            with engine.connect() as connection:
                connection.exec_driver_sql("SELECT 1")
            return
        except OperationalError:
            if attempt == max_attempts - 1:
                raise
            time.sleep(delay_seconds)


def bootstrap() -> None:
    wait_for_database()
    initialize_database()
    seed()


if __name__ == "__main__":
    bootstrap()
