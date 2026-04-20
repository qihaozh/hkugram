from fastapi import APIRouter, Depends, HTTPException
from httpx import HTTPError, HTTPStatusError, TimeoutException
from sqlalchemy.orm import Session

from app import schemas
from app.agent_engine import build_post_links, curate_agent_results, draft_agent_sql, summarize_agent_rows
from app.database import get_db
from app.query_engine import execute_read_only_sql, validate_read_only_sql

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/draft", response_model=schemas.AgentDraftResponse)
async def draft_query(payload: schemas.AgentPromptRequest):
    try:
        draft = await draft_agent_sql(payload.prompt)
        return schemas.AgentDraftResponse(
            prompt=payload.prompt,
            sql=draft["sql"],
            explanation=draft["explanation"],
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPStatusError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Could not prepare a safe query: AI API returned {exc.response.status_code}: {exc.response.text[:300]}",
        ) from exc
    except TimeoutException as exc:
        raise HTTPException(
            status_code=504,
            detail="Could not prepare a safe query: AI API request timed out. Try again or increase AI_TIMEOUT_SECONDS.",
        ) from exc
    except (HTTPError, KeyError, ValueError) as exc:
        message = str(exc) or type(exc).__name__
        raise HTTPException(status_code=400, detail=f"Could not prepare a safe query: {message}") from exc


@router.post("/execute", response_model=schemas.AgentExecuteResponse)
async def execute_approved_query(payload: schemas.AgentExecuteRequest, db: Session = Depends(get_db)):
    try:
        sql = validate_read_only_sql(payload.sql)
        result = execute_read_only_sql(db, sql)
        rows = result["rows"]
        curated = await curate_agent_results(payload.prompt, rows)
        return schemas.AgentExecuteResponse(
            sql=sql,
            columns=result["columns"],
            row_count=result["row_count"],
            rows=rows,
            answer=curated.get("summary") or summarize_agent_rows(rows),
            post_links=build_post_links(rows),
            recommendations=curated.get("recommendations") or [],
            analysis_source=str(curated.get("source") or "fallback"),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
