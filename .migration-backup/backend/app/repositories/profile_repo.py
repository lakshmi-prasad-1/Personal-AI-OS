from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.core_models import UserProfile
from app.schemas.profile import UserProfileUpdate


async def get_profile(db: AsyncSession, user_id: UUID) -> Optional[UserProfile]:
    result = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
    return result.scalars().first()


async def get_or_create_profile(db: AsyncSession, user_id: UUID) -> UserProfile:
    profile = await get_profile(db, user_id)
    if profile:
        return profile
    profile = UserProfile(user_id=user_id)
    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def update_profile(db: AsyncSession, user_id: UUID, updates: UserProfileUpdate) -> UserProfile:
    profile = await get_or_create_profile(db, user_id)
    data = updates.model_dump(exclude_unset=True)
    if "skills" in data and data["skills"] is not None:
        data["skills"] = [s.model_dump() if hasattr(s, "model_dump") else s for s in data["skills"]]
    if "goals" in data and data["goals"] is not None:
        data["goals"] = [g.model_dump() if hasattr(g, "model_dump") else g for g in data["goals"]]
    if "current_projects" in data and data["current_projects"] is not None:
        data["current_projects"] = [
            p.model_dump() if hasattr(p, "model_dump") else p for p in data["current_projects"]
        ]
    for key, value in data.items():
        setattr(profile, key, value)
    await db.commit()
    await db.refresh(profile)
    return profile
