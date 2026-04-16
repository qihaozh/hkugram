from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.config import get_settings
from app.query_engine import text_to_sql, validate_read_only_sql


JSON_OBJECT_PATTERN = re.compile(r"\{.*?\}", re.DOTALL)
FENCED_BLOCK_PATTERN = re.compile(r"```(?:json|sql)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)
SELECT_PATTERN = re.compile(r"\bselect\b[\s\S]*?(?:\blimit\s+\d+)?", re.IGNORECASE)


AGENT_SCHEMA_SUMMARY = """
Tables:
- users(id, username, display_name, bio, created_at)
- posts(id, user_id, category, description, image_url, image_width, image_height, created_at)
- likes(id, user_id, post_id, created_at)
- comments(id, user_id, post_id, body, created_at)
- follows(id, follower_id, followee_id, created_at)

Useful post result columns:
- p.id AS post_id
- p.description
- p.image_url
- p.category
- u.username
- u.display_name
- COUNT(DISTINCT l.id) AS like_count
- COUNT(DISTINCT c.id) AS comment_count
"""


SYSTEM_PROMPT = f"""
You are HKUgram's database assistant. Convert the user's natural-language question into one MySQL SELECT query.

Rules:
- Output JSON only with keys: sql, explanation.
- Generate exactly one SELECT statement.
- Never generate INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, TRUNCATE, REPLACE, GRANT, REVOKE, CALL, EXECUTE, or semicolons.
- Do not use SQL comments.
- Query only the HKUgram app tables listed below.
- Prefer post-centered answers when the user asks about content, discovery, ranking, popularity, comments, likes, authors, or categories.
- For post-centered answers, include p.id AS post_id, p.description, p.image_url, p.category, u.username, u.display_name, like_count, and comment_count.
- Use joins and aggregation where helpful.
- Sort results meaningfully, for example by like_count, comment_count, relevance, or p.created_at.
- Always LIMIT results to 10 or fewer.

{AGENT_SCHEMA_SUMMARY}
"""


async def draft_agent_sql(prompt: str) -> dict[str, str]:
    settings = get_settings()
    if not settings.ai_api_key:
        raise RuntimeError("AI_API_KEY is not configured.")

    payload = {
        "model": settings.ai_model,
        "temperature": 0,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    }

    async with httpx.AsyncClient(timeout=settings.ai_timeout_seconds) as client:
        response = await client.post(
            f"{settings.ai_base_url.rstrip('/')}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.ai_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )
        response.raise_for_status()

    content = response.json()["choices"][0]["message"]["content"]
    try:
        parsed = parse_agent_content(content)
        sql = validate_read_only_sql(parsed["sql"])
        explanation = parsed.get("explanation") or "I prepared a safe read-only query."
        return {"sql": sql, "explanation": explanation}
    except ValueError:
        generated = text_to_sql(prompt)
        sql = validate_read_only_sql(generated.sql)
        return {
            "sql": sql,
            "explanation": "I used the local safe SQL translator because the AI response was not directly executable.",
        }


def parse_agent_content(content: str) -> dict[str, str]:
    candidates = [content.strip()]
    candidates.extend(match.group(1).strip() for match in FENCED_BLOCK_PATTERN.finditer(content))
    candidates.extend(match.group(0).strip() for match in JSON_OBJECT_PATTERN.finditer(content))

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        sql = str(parsed.get("sql", "")).strip()
        if sql:
            return {
                "sql": sql,
                "explanation": str(parsed.get("explanation") or "I prepared a safe read-only query."),
            }

    select_sql = extract_select_sql(content)
    if select_sql:
        return {
            "sql": select_sql,
            "explanation": "I extracted a read-only SQL query from the model response.",
        }

    raise ValueError("The AI response did not contain a usable read-only SELECT query.")


def extract_select_sql(content: str) -> str | None:
    text = content.replace("\r", "\n")
    for fenced_match in FENCED_BLOCK_PATTERN.finditer(text):
        block = fenced_match.group(1).strip()
        if block.lower().startswith("select"):
            return clean_sql_candidate(block)

    lower_text = text.lower()
    start = lower_text.find("select")
    if start == -1:
        return None

    candidate = text[start:].strip()
    candidate = re.split(r"\n\s*(?:explanation|note|result|answer)\s*:", candidate, maxsplit=1, flags=re.IGNORECASE)[0]
    return clean_sql_candidate(candidate)


def clean_sql_candidate(sql: str) -> str:
    lines = []
    for line in sql.strip().splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("```"):
            continue
        lines.append(line)
    cleaned = "\n".join(lines).strip()
    if cleaned.endswith(";"):
        cleaned = cleaned[:-1].strip()
    return cleaned


def summarize_agent_rows(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return "I could not find matching posts or records for that question."

    post_rows = [row for row in rows if row.get("post_id") or row.get("id")]
    if post_rows:
        top = post_rows[:3]
        labels = []
        for row in top:
            author = row.get("display_name") or row.get("username") or "Unknown author"
            description = str(row.get("description") or "Untitled post")
            labels.append(f"{author}: {description}")
        return "Top matching posts: " + " | ".join(labels)

    return f"I found {len(rows)} matching database rows."


def build_post_links(rows: list[dict[str, Any]]) -> list[dict[str, str | int]]:
    links = []
    seen = set()
    for row in rows:
        post_id = row.get("post_id") or row.get("id")
        if not isinstance(post_id, int) or post_id in seen:
            continue
        seen.add(post_id)
        label = str(row.get("description") or f"Open post {post_id}")
        links.append({"post_id": post_id, "label": label[:120]})
    return links
