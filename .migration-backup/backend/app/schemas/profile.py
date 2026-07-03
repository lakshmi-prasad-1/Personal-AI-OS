from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class ProfileSkill(BaseModel):
    name: str
    level: Optional[str] = None


class ProfileGoal(BaseModel):
    title: str
    status: str = "active"
    target_date: Optional[str] = None


class ProfileProject(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "active"


class UserProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    institution: Optional[str] = None
    current_semester: Optional[str] = None
    career_interests: Optional[List[str]] = None
    skills: Optional[List[ProfileSkill]] = None
    goals: Optional[List[ProfileGoal]] = None
    current_projects: Optional[List[ProfileProject]] = None
    current_work: Optional[str] = None
    resume_summary: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None


class UserProfileRead(BaseModel):
    id: UUID
    user_id: UUID
    display_name: Optional[str] = None
    bio: Optional[str] = None
    institution: Optional[str] = None
    current_semester: Optional[str] = None
    career_interests: List[str] = []
    skills: List[Any] = []
    goals: List[Any] = []
    current_projects: List[Any] = []
    current_work: Optional[str] = None
    resume_summary: Optional[str] = None
    preferences: Dict[str, Any] = {}
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
