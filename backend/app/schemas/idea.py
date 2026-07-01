from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class IdeaCategory(str, Enum):
    STARTUP = "Startup"
    PROJECT = "Project"
    RESEARCH = "Research"
    RANDOM_THOUGHT = "RandomThought"


class IdeaStatus(str, Enum):
    RAW = "raw"
    EXPLORING = "exploring"
    VALIDATED = "validated"
    ARCHIVED = "archived"


class IdeaCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    category: IdeaCategory = IdeaCategory.RANDOM_THOUGHT
    tags: List[str] = []
    status: IdeaStatus = IdeaStatus.RAW
    priority: int = Field(default=3, ge=1, le=5)


class IdeaUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    category: Optional[IdeaCategory] = None
    tags: Optional[List[str]] = None
    status: Optional[IdeaStatus] = None
    priority: Optional[int] = Field(None, ge=1, le=5)


class IdeaRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    content: str
    category: str
    tags: List[str] = []
    status: str
    priority: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
