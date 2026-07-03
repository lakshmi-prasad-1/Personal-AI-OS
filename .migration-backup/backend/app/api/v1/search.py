from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.core_models import User
from app.repositories.search_repo import unified_semantic_search

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    limit: int = 10

@router.post("/")
async def global_search(
    request: SearchRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Search the entire OS (Memories, Notes, Resources, Ideas) simultaneously using Semantic Vector Math.
    """
    results = await unified_semantic_search(db, current_user.id, request.query, request.limit)
    return results
