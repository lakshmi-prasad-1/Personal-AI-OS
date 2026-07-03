from typing import List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class StudyProfileCreate(BaseModel):
    subjects: List[str] = []
    semester: Optional[str] = None
    study_goals: List[str] = []


class StudyProfileRead(BaseModel):
    id: UUID
    user_id: UUID
    semester: Optional[str] = None
    subjects: List[str] = []
    study_goals: List[str] = []
    created_at: datetime

    class Config:
        from_attributes = True
