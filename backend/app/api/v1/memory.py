from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.intelligence.memory.memory_service import process_text_for_memories
from app.intelligence.brain.brain_service import brain_service
from app.models.core_models import User
from app.repositories import memory_repo
from app.schemas.memory import MemoryCreate, MemoryRead, MemoryUpdate

router = APIRouter()


class MemoryExtractionRequest(BaseModel):
    text: str


class MemorySearchRequest(BaseModel):
    query: str
    limit: int = 5


@router.post("/", response_model=MemoryRead, status_code=status.HTTP_201_CREATED)
async def create_memory(
    memory_in: MemoryCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Create a manual memory entry for the current user."""
    memory = await memory_repo.create_memory(db, current_user.id, memory_in)
    await brain_service.on_entity_created(
        db, current_user.id, "Memory", memory.id, memory.title, memory.tags or []
    )
    return memory


@router.get("/", response_model=List[MemoryRead])
async def list_memories(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """List memories for the current user, optionally filtered by category."""
    return await memory_repo.get_user_memories(db, current_user.id)


@router.get("/{memory_id}", response_model=MemoryRead)
async def get_memory(
    memory_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single memory."""
    memory = await memory_repo.get_memory(db, memory_id, current_user.id)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory


@router.patch("/{memory_id}", response_model=MemoryRead)
async def update_memory(
    memory_id: UUID,
    memory_in: MemoryUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update an existing memory."""
    memory = await memory_repo.update_memory(db, memory_id, current_user.id, memory_in)
    if not memory:
        raise HTTPException(status_code=404, detail="Memory not found")
    return memory


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a memory."""
    deleted = await memory_repo.delete_memory(db, memory_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found")


@router.post("/extract")
async def extract_and_store_memory(
    request: MemoryExtractionRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Trigger the memory extraction engine manually."""
    stored_ids = await process_text_for_memories(db, current_user.id, request.text)
    return {"status": "success", "stored": len(stored_ids), "memory_ids": [str(i) for i in stored_ids]}


@router.post("/search")
async def search_memory(
    request: MemorySearchRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Semantic search across the user's memories using pgvector when available."""
    from app.intelligence.routing.llm_client import generate_embedding

    query_vector = await generate_embedding(request.query)
    if not query_vector:
        results = await memory_repo.full_text_search_memories(db, current_user.id, request.query, request.limit)
        return {"results": [{"id": str(m.id), "title": m.title, "description": m.description, "category": m.category, "similarity": 0.5} for m in results]}

    results = await memory_repo.search_similar_memories(
        db=db,
        user_id=current_user.id,
        query_embedding=query_vector,
        limit=request.limit,
    )

    return {"results": results}
