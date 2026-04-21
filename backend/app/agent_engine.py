from __future__ import annotations

import json
import re
from datetime import date, datetime
from typing import Any

import httpx

from app.config import get_settings
from app.query_engine import text_to_sql, validate_read_only_sql


JSON_OBJECT_PATTERN = re.compile(r"\{.*?\}", re.DOTALL)
FENCED_BLOCK_PATTERN = re.compile(r"```(?:json|sql)?\s*(.*?)```", re.IGNORECASE | re.DOTALL)
SELECT_PATTERN = re.compile(r"\bselect\b[\s\S]*?(?:\blimit\s+\d+)?", re.IGNORECASE)
WORD_PATTERN = re.compile(r"[a-z0-9]{3,}")

STOP_WORDS = {
    "about",
    "after",
    "all",
    "and",
    "are",
    "best",
    "find",
    "for",
    "from",
    "have",
    "into",
    "just",
    "most",
    "need",
    "post",
    "posts",
    "related",
    "show",
    "that",
    "the",
    "their",
    "them",
    "these",
    "this",
    "with",
    "your",
}
MAX_RECOMMENDATIONS = 3


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
You are HKUgram's database assistant. Convert the user's natural-language question into one PostgreSQL SELECT query.

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


CURATION_SYSTEM_PROMPT = """
You are HKUgram's discovery assistant. The user already approved and executed a safe read-only database query.

Your task:
- Review the returned post metadata.
- Recommend the posts that are most relevant to the user's request or most likely to interest them.

Rules:
- Use only the provided metadata: description text, category, author names, timestamps, likes, comments, and optional comment snippets.
- Prefer results that combine relevance and engagement.
- Match the user's language when it is clear from the prompt.
- Output JSON only with keys: summary, recommendations.
- recommendations must be a list of objects with keys: post_id, headline, summary, reason, label.
- Keep label short, for example "Open post".

Writing style:
- Sound like a helpful in-app assistant that already searched for the user.
- The summary should read like a concise recommendation intro, for example: "I looked through the related posts and found that this one stands out because..."
- The reason should sound specific and conversational, not robotic or keyword-stuffed.
- In reason, explain why the post is worth opening using relevance, engagement, or discussion signals.
- Avoid mentioning SQL, database rows, metadata, or internal system details.
- Do not say you saw the image. Talk only about text, category, likes, comments, timestamps, and comment snippets.

Example output shape:
{
  "summary": "I looked through the related posts and found a few strong matches. These stand out either because they directly match what you asked for or because they already sparked solid engagement.",
  "recommendations": [
    {
      "post_id": 12,
      "headline": "Campus coffee guide with active discussion",
      "summary": "This post focuses on late-night campus coffee spots and study corners, so it is closely aligned with a search about study-friendly places.",
      "reason": "This one feels especially relevant because the description matches your topic directly, and the comment activity suggests other users are actively discussing which spots are actually useful.",
      "label": "Open post"
    }
  ]
}
"""


async def request_ai_completion(messages: list[dict[str, str]], temperature: float = 0) -> str:
    settings = get_settings()
    if not settings.ai_api_key:
        raise RuntimeError("AI_API_KEY is not configured.")

    payload = {
        "model": settings.ai_model,
        "temperature": temperature,
        "messages": messages,
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

    return response.json()["choices"][0]["message"]["content"]


async def draft_agent_sql(prompt: str) -> dict[str, str]:
    content = await request_ai_completion(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )
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

    post_rows = extract_post_candidates(rows)
    if post_rows:
        top = post_rows[:3]
        labels = []
        for post in top:
            author = post.get("display_name") or post.get("username") or "Unknown author"
            description = str(post.get("description") or "Untitled post")
            labels.append(f"{author}: {description}")
        return "Top matching posts: " + " | ".join(labels)

    return f"I found {len(rows)} matching database rows."


def build_post_links(rows: list[dict[str, Any]]) -> list[dict[str, str | int]]:
    return [
        {
            "post_id": int(post["post_id"]),
            "label": truncate_text(str(post.get("description") or f"Open post {post['post_id']}"), 120),
        }
        for post in extract_post_candidates(rows)
    ]


async def curate_agent_results(prompt: str | None, rows: list[dict[str, Any]]) -> dict[str, Any]:
    post_candidates = extract_post_candidates(rows)
    if not post_candidates:
        return {
            "summary": summarize_agent_rows(rows),
            "recommendations": [],
            "source": "fallback",
        }

    if not prompt:
        return build_fallback_curation(prompt, post_candidates)

    try:
        content = await request_ai_completion(
            [
                {"role": "system", "content": CURATION_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "user_prompt": prompt,
                            "posts": post_candidates,
                        },
                        ensure_ascii=False,
                        indent=2,
                    ),
                },
            ],
            temperature=0.2,
        )
        return parse_curation_content(content, prompt, post_candidates)
    except (RuntimeError, httpx.HTTPError, KeyError, TypeError, ValueError):
        return build_fallback_curation(prompt, post_candidates)


def parse_curation_content(content: str, prompt: str, post_candidates: list[dict[str, Any]]) -> dict[str, Any]:
    candidates = [content.strip()]
    candidates.extend(match.group(1).strip() for match in FENCED_BLOCK_PATTERN.finditer(content))
    candidates.extend(match.group(0).strip() for match in JSON_OBJECT_PATTERN.finditer(content))

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
        except json.JSONDecodeError:
            continue

        recommendations = normalize_recommendations(parsed.get("recommendations"), prompt, post_candidates)
        summary = truncate_text(str(parsed.get("summary") or "").strip(), 420)
        if summary or recommendations:
            return {
                "summary": summary or build_fallback_summary(prompt, recommendations),
                "recommendations": recommendations,
                "source": "ai",
            }

    raise ValueError("The AI response did not contain usable curated recommendations.")


def normalize_recommendations(
    raw_recommendations: Any,
    prompt: str | None,
    post_candidates: list[dict[str, Any]],
) -> list[dict[str, str | int]]:
    if not isinstance(raw_recommendations, list):
        return []

    by_post_id = {int(post["post_id"]): post for post in post_candidates}
    recommendations = []
    seen = set()
    for item in raw_recommendations:
        if not isinstance(item, dict):
            continue
        post_id = coerce_int(item.get("post_id"))
        if post_id is None or post_id not in by_post_id or post_id in seen:
            continue

        post = by_post_id[post_id]
        seen.add(post_id)
        recommendations.append(
            {
                "post_id": post_id,
                "headline": truncate_text(
                    str(item.get("headline") or build_recommendation_headline(post)),
                    90,
                ),
                "summary": truncate_text(
                    str(item.get("summary") or post.get("description") or "Relevant match."),
                    220,
                ),
                "reason": truncate_text(
                    str(item.get("reason") or build_recommendation_reason(prompt, post)),
                    220,
                ),
                "label": truncate_text(
                    str(item.get("label") or f"Open post {post_id}"),
                    32,
                ),
            }
        )
        if len(recommendations) >= MAX_RECOMMENDATIONS:
            break

    return recommendations


def build_fallback_curation(prompt: str | None, post_candidates: list[dict[str, Any]]) -> dict[str, Any]:
    ranked_posts = rank_post_candidates(prompt, post_candidates)[:MAX_RECOMMENDATIONS]
    recommendations = [
        {
            "post_id": int(post["post_id"]),
            "headline": build_recommendation_headline(post),
            "summary": truncate_text(str(post.get("description") or "Relevant match."), 220),
            "reason": build_recommendation_reason(prompt, post),
            "label": f"Open post {post['post_id']}",
        }
        for post in ranked_posts
    ]
    return {
        "summary": build_fallback_summary(prompt, recommendations),
        "recommendations": recommendations,
        "source": "fallback",
    }


def build_fallback_summary(prompt: str | None, recommendations: list[dict[str, str | int]]) -> str:
    if not recommendations:
        return "I found matching rows, but there were no post-style results to recommend."

    if prompt:
        return (
            f'I searched related content for "{prompt}" and highlighted the posts that best combine '
            "query relevance with likes and comment activity."
        )

    return "I highlighted the strongest post matches from the approved query using the available engagement signals."


def rank_post_candidates(prompt: str | None, post_candidates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    keywords = extract_keywords(prompt or "")

    def score(post: dict[str, Any]) -> tuple[float, int, int, str]:
        searchable_text = " ".join(
            [
                str(post.get("description") or ""),
                str(post.get("category") or ""),
                str(post.get("username") or ""),
                str(post.get("display_name") or ""),
                str(post.get("comment_snippet") or ""),
            ]
        ).lower()
        overlap = sum(1 for keyword in keywords if keyword in searchable_text)
        like_count = coerce_int(post.get("like_count")) or 0
        comment_count = coerce_int(post.get("comment_count")) or 0
        created_at = str(post.get("created_at") or "")
        return (
            overlap * 100 + like_count * 2 + comment_count * 3,
            like_count,
            comment_count,
            created_at,
        )

    return sorted(post_candidates, key=score, reverse=True)


def extract_keywords(prompt: str) -> set[str]:
    return {
        match.group(0)
        for match in WORD_PATTERN.finditer(prompt.lower())
        if match.group(0) not in STOP_WORDS
    }


def extract_post_candidates(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    posts_by_id: dict[int, dict[str, Any]] = {}
    for row in rows:
        post_id = coerce_int(row.get("post_id") or row.get("id"))
        if post_id is None:
            continue

        description = truncate_text(str(row.get("description") or "").strip(), 280)
        comment_snippet = truncate_text(
            str(row.get("comment_body") or row.get("body") or "").strip(),
            180,
        )
        created_at = serialize_for_prompt(row.get("created_at"))
        candidate = {
            "post_id": post_id,
            "username": truncate_text(str(row.get("username") or "").strip(), 80),
            "display_name": truncate_text(str(row.get("display_name") or "").strip(), 120),
            "category": truncate_text(str(row.get("category") or "").strip(), 50),
            "description": description,
            "like_count": coerce_int(row.get("like_count")) or 0,
            "comment_count": coerce_int(row.get("comment_count")) or 0,
            "created_at": created_at,
            "comment_snippet": comment_snippet,
        }

        existing = posts_by_id.get(post_id)
        if existing is None:
            posts_by_id[post_id] = candidate
            continue

        if len(candidate["description"]) > len(str(existing.get("description") or "")):
            existing["description"] = candidate["description"]
        if candidate["comment_snippet"] and not existing.get("comment_snippet"):
            existing["comment_snippet"] = candidate["comment_snippet"]
        existing["like_count"] = max(int(existing.get("like_count") or 0), candidate["like_count"])
        existing["comment_count"] = max(int(existing.get("comment_count") or 0), candidate["comment_count"])
        if candidate["created_at"] and not existing.get("created_at"):
            existing["created_at"] = candidate["created_at"]
        if candidate["category"] and not existing.get("category"):
            existing["category"] = candidate["category"]
        if candidate["display_name"] and not existing.get("display_name"):
            existing["display_name"] = candidate["display_name"]
        if candidate["username"] and not existing.get("username"):
            existing["username"] = candidate["username"]

    return list(posts_by_id.values())


def build_recommendation_headline(post: dict[str, Any]) -> str:
    display_name = str(post.get("display_name") or "").strip()
    username = str(post.get("username") or "").strip()
    category = str(post.get("category") or "").strip()
    if display_name:
        author = display_name
    elif username:
        author = f"@{username}"
    else:
        author = "Featured post"
    if category:
        return f"{author} · {category}"
    return author


def build_recommendation_reason(prompt: str | None, post: dict[str, Any]) -> str:
    reasons = []
    if extract_keywords(prompt or ""):
        searchable_text = " ".join(
            [
                str(post.get("description") or ""),
                str(post.get("category") or ""),
                str(post.get("comment_snippet") or ""),
            ]
        ).lower()
        if any(keyword in searchable_text for keyword in extract_keywords(prompt or "")):
            reasons.append("Matches your request closely")

    like_count = coerce_int(post.get("like_count")) or 0
    comment_count = coerce_int(post.get("comment_count")) or 0
    engagement_parts = []
    if like_count:
        engagement_parts.append(f"{like_count} likes")
    if comment_count:
        engagement_parts.append(f"{comment_count} comments")
    if engagement_parts:
        reasons.append("Engagement: " + " and ".join(engagement_parts))

    if post.get("comment_snippet"):
        reasons.append("Includes discussion in the comments")
    if post.get("category") and not reasons:
        reasons.append(f"Strong category fit: {post['category']}")

    return truncate_text(". ".join(reasons) or "Relevant match from the approved query.", 220)


def serialize_for_prompt(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return truncate_text(str(value), 80)


def truncate_text(value: str, limit: int) -> str:
    normalized = " ".join(value.split())
    if len(normalized) <= limit:
        return normalized
    return normalized[: max(limit - 3, 1)].rstrip() + "..."


def coerce_int(value: Any) -> int | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, int):
        return value
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
