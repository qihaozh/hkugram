import hashlib
import hmac
import secrets
from base64 import urlsafe_b64decode, urlsafe_b64encode


PBKDF2_ITERATIONS = 120_000


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        PBKDF2_ITERATIONS,
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        algorithm, iteration_text, salt, digest = password_hash.split("$", 3)
    except ValueError:
        return False

    if algorithm != "pbkdf2_sha256":
        return False

    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt.encode("utf-8"),
        int(iteration_text),
    ).hex()
    return hmac.compare_digest(candidate, digest)


def sign_session_value(username: str, secret: str) -> str:
    payload = urlsafe_b64encode(username.encode("utf-8")).decode("ascii")
    signature = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def verify_session_value(session_value: str, secret: str) -> str | None:
    try:
        payload, signature = session_value.split(".", 1)
    except ValueError:
        return None

    expected = hmac.new(secret.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(signature, expected):
        return None

    try:
        return urlsafe_b64decode(payload.encode("ascii")).decode("utf-8")
    except Exception:
        return None
