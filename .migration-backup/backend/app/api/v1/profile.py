from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.core_models import User
from app.repositories import profile_repo
from app.schemas.profile import UserProfileRead, UserProfileUpdate

router = APIRouter()


@router.get("/me", response_model=UserProfileRead)
async def get_my_profile(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get the structured user profile used by the AI Brain."""
    return await profile_repo.get_or_create_profile(db, current_user.id)


@router.patch("/me", response_model=UserProfileRead)
async def update_my_profile(
    profile_in: UserProfileUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update structured profile fields (goals, skills, projects, etc.)."""
    return await profile_repo.update_profile(db, current_user.id, profile_in)
