from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import schemas
from app.database import get_db
from app.query_engine import (
    SCHEMA_CONTEXT,
    build_search_prompt,
    execute_read_only_sql,
    execute_full_text_search,
    list_supported_questions,
    text_to_sql,
)

router = APIRouter(prefix="/query", tags=["query"])


@router.get("/schema")
def get_query_schema() -> dict[str, object]:
    return {
        "tables": SCHEMA_CONTEXT,
        "supported_questions": list_supported_questions(),
    }


@router.post("/sql", response_model=schemas.SqlQueryResponse)
def run_sql_query(payload: schemas.SqlQueryRequest, db: Session = Depends(get_db)):
    try:
        return execute_read_only_sql(db, payload.sql, payload.params)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/text-to-sql", response_model=schemas.TextToSqlResponse)
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


@router.post("/search-comparison", response_model=schemas.SearchComparisonResponse)
def compare_search_methods(payload: schemas.SearchComparisonRequest, db: Session = Depends(get_db)):
    try:
        full_text_sql, full_text_result, used_fallback = execute_full_text_search(db, payload.query)
        generated = text_to_sql(build_search_prompt(payload.query))
        text_to_sql_result = execute_read_only_sql(db, generated.sql, generated.params)
        notes = [
            "Full-text SQL ranks keyword matches using MySQL MATCH ... AGAINST.",
            "Text-to-SQL converts the same search intent into a safe read-only SQL query.",
        ]
        if used_fallback:
            notes.append("The full-text query used a LIKE fallback because the database did not accept FULLTEXT search.")
        return schemas.SearchComparisonResponse(
            query=payload.query,
            full_text_sql=" ".join(full_text_sql.split()),
            full_text=full_text_result,
            text_to_sql=schemas.TextToSqlResponse(
                title=generated.title,
                sql=" ".join(generated.sql.split()),
                params=generated.params,
                columns=text_to_sql_result["columns"],
                row_count=text_to_sql_result["row_count"],
                rows=text_to_sql_result["rows"],
            ),
            notes=notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
