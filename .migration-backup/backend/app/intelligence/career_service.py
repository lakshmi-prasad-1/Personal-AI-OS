from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from app.models.career_models import Application, Resume
from app.schemas.career import ApplicationCreate, ResumeCreate


class CareerService:
    async def create_resume(self, db, user_id: UUID, resume_in: ResumeCreate) -> Resume:
        resume = Resume(
            user_id=user_id,
            title=resume_in.title,
            content=resume_in.content,
            structured_data=resume_in.structured_data or {},
            target_role=resume_in.target_role,
            version=1,
            is_active=True,
        )
        await db.add(resume)
        await db.commit()
        await db.refresh(resume)
        return resume

    async def create_application(self, db, user_id: UUID, application_in: ApplicationCreate, resume_id: Optional[UUID] = None) -> Application:
        application = Application(
            user_id=user_id,
            company=application_in.company,
            role=application_in.role,
            status=application_in.status.value if hasattr(application_in.status, "value") else str(application_in.status),
            applied_at=application_in.applied_at or datetime.utcnow(),
            deadline=application_in.deadline,
            job_description=application_in.job_description,
            job_url=application_in.job_url,
            source=application_in.source,
            location=application_in.location,
            salary_range=application_in.salary_range,
            notes=application_in.notes,
            resume_id=resume_id,
            timeline=[{"status": "applied", "date": datetime.utcnow().isoformat(), "notes": "Created"}],
        )
        await db.add(application)
        await db.commit()
        await db.refresh(application)
        return application
