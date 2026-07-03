from typing import Annotated, Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.intelligence.global_intelligence.orchestrator import GlobalIntelligenceOrchestrator
from app.models.core_models import User

router = APIRouter()
orchestrator = GlobalIntelligenceOrchestrator()


@router.post("/snapshot")
async def get_global_intelligence_snapshot(
    payload: Dict[str, Any],
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Return a cross-module intelligence snapshot for the current user."""
    return orchestrator.build_snapshot(payload)


@router.post("/recommend")
async def get_global_recommendation(
    payload: Dict[str, Any],
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Return a recommendation from the global intelligence layer."""
    category = payload.get("category", "study")
    engine = orchestrator.recommendation_engine
    return engine.recommend(category, payload)
