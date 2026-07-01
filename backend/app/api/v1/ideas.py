from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.core_models import User
from app.intelligence.brain.brain_service import brain_service
from app.repositories import idea_repo
from app.schemas.idea import IdeaCreate, IdeaRead, IdeaUpdate

router = APIRouter()


@router.post("/", response_model=IdeaRead, status_code=status.HTTP_201_CREATED)
async def create_idea(
    idea_in: IdeaCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Capture a new idea to the vault."""
    idea = await idea_repo.create_idea(db, current_user.id, idea_in)
    await brain_service.on_entity_created(
        db, current_user.id, "Idea", idea.id, idea.title, idea.tags or []
    )
    return idea


@router.get("/", response_model=List[IdeaRead])
async def list_ideas(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get all ideas for the user."""
    return await idea_repo.get_user_ideas(db, current_user.id)


@router.get("/{idea_id}", response_model=IdeaRead)
async def get_idea(
    idea_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single idea."""
    idea = await idea_repo.get_idea(db, idea_id, current_user.id)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


@router.patch("/{idea_id}", response_model=IdeaRead)
async def update_idea(
    idea_id: UUID,
    idea_in: IdeaUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update an existing idea."""
    idea = await idea_repo.update_idea(db, idea_id, current_user.id, idea_in)
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return idea


@router.delete("/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_idea(
    idea_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete an idea."""
    deleted = await idea_repo.delete_idea(db, idea_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Idea not found")
