from typing import Annotated, Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.intelligence.brain.brain_service import brain_service
from app.models.core_models import User
from app.schemas.brain import (
    BrainContextRequest,
    BrainContextResponse,
    BrainContextSection,
    BrainDecisionRequest,
    BrainDecisionResponse,
    DecisionAction,
    UniversalSearchRequest,
    UniversalSearchResponse,
    UniversalSearchResult,
)

router = APIRouter()


@router.post("/context", response_model=BrainContextResponse)
async def preview_context(
    request: BrainContextRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Preview the assembled brain context for a query."""
    ctx = await brain_service.get_context(db, current_user.id, request.query, request.limit)
    return BrainContextResponse(
        query=ctx["query"],
        sections=[BrainContextSection(**s) for s in ctx["sections"]],
        assembled_prompt=ctx["assembled_prompt"],
    )


@router.post("/decide", response_model=BrainDecisionResponse)
async def decide_next_actions(
    request: BrainDecisionRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Evaluate proactive decisions based on user context."""
    decisions = await brain_service.decide(db, current_user.id, request.query, request.context)
    return BrainDecisionResponse(decisions=[DecisionAction(**d) for d in decisions])


@router.post("/search", response_model=UniversalSearchResponse)
async def universal_search(
    request: UniversalSearchRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Ranked universal search across all brain modules."""
    result = await brain_service.universal_search(
        db, current_user.id, request.query, request.limit, request.types
    )
    return UniversalSearchResponse(
        query=result["query"],
        results=[
            UniversalSearchResult(
                id=str(r.get("id", "")),
                title=r.get("title", ""),
                type=r.get("type", "Unknown"),
                similarity=float(r.get("similarity", 0)),
                relevance_score=r.get("relevance_score"),
                snippet=r.get("description"),
            )
            for r in result["results"]
        ],
    )


@router.post("/ingest")
async def ingest_natural_language(
    payload: Dict[str, Any],
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Ingest free-form text into memories (voice-ready natural language interface)."""
    text = payload.get("text", "")
    if not text.strip():
        return {"stored": 0, "memory_ids": []}
    ids = await brain_service.ingest_text(db, current_user.id, text)
    return {"stored": len(ids), "memory_ids": [str(i) for i in ids]}
