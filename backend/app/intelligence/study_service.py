from __future__ import annotations

from typing import Any
from uuid import UUID

from app.models.core_models import UserProfile
from app.schemas.study import StudyProfileCreate


class StudyService:
    async def create_or_update_profile(self, db, user_id: UUID, profile_in: StudyProfileCreate) -> UserProfile:
        profile = UserProfile(
            user_id=user_id,
            current_semester=profile_in.semester,
            skills=profile_in.subjects or [],
            goals=profile_in.study_goals or [],
            preferences={"study_goals": profile_in.study_goals or []},
        )
        await db.add(profile)
        await db.commit()
        await db.refresh(profile)
        return profile
