from typing import Annotated
from fastapi import APIRouter, Depends
from app.models.core_models import User
from app.schemas.user import UserRead
from app.api.deps import get_current_active_user

router = APIRouter()

@router.get("/me", response_model=UserRead)
async def read_users_me(
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    """
    Get current user.
    """
    return current_user
