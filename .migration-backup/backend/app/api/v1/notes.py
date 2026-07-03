from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.core_models import User
from app.intelligence.brain.brain_service import brain_service
from app.repositories import note_repo
from app.schemas.note import NoteCreate, NoteRead, NoteUpdate

router = APIRouter()


class SearchRequest(BaseModel):
    query: str
    limit: int = 5


@router.post("/", response_model=NoteRead, status_code=status.HTTP_201_CREATED)
async def create_note(
    note_in: NoteCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Create a new smart note."""
    note = await note_repo.create_note(db, current_user.id, note_in)
    await brain_service.on_entity_created(
        db, current_user.id, "Note", note.id, note.title, note.tags or []
    )
    return note


@router.get("/", response_model=List[NoteRead])
async def list_notes(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get all notes for the user."""
    return await note_repo.get_user_notes(db, current_user.id)


@router.get("/{note_id}", response_model=NoteRead)
async def get_note(
    note_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single note."""
    note = await note_repo.get_note(db, note_id, current_user.id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.patch("/{note_id}", response_model=NoteRead)
async def update_note(
    note_id: UUID,
    note_in: NoteUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update a note."""
    note = await note_repo.update_note(db, note_id, current_user.id, note_in)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    note_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a note."""
    deleted = await note_repo.delete_note(db, note_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")


@router.post("/search")
async def search_notes(
    request: SearchRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Semantic search across notes."""
    results = await note_repo.search_similar_notes(db, current_user.id, request.query, request.limit)
    return {"results": results}
