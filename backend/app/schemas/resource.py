from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl


class ResourceCategory(str, Enum):
    PDF = "PDF"
    ARTICLE = "Article"
    BLOG = "Blog"
    GITHUB = "GitHub"
    YOUTUBE = "YouTube"
    COURSE = "Course"
    DOCUMENTATION = "Documentation"
    CODE_SNIPPET = "CodeSnippet"


class ResourceDifficulty(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ResourceStatus(str, Enum):
    UNREAD = "unread"
    READING = "reading"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ResourceCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    category: ResourceCategory
    source_url: Optional[str] = None
    tags: List[str] = []
    difficulty: Optional[ResourceDifficulty] = None
    status: ResourceStatus = ResourceStatus.UNREAD
    priority: int = Field(default=3, ge=1, le=5)
    notes: Optional[str] = None


class ResourceUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    category: Optional[ResourceCategory] = None
    source_url: Optional[str] = None
    tags: Optional[List[str]] = None
    difficulty: Optional[ResourceDifficulty] = None
    status: Optional[ResourceStatus] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    notes: Optional[str] = None


class ResourceRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str] = None
    category: str
    file_type: Optional[str] = None
    file_path: Optional[str] = None
    source_url: Optional[str] = None
    tags: List[str] = []
    difficulty: Optional[str] = None
    status: str
    priority: int
    notes: Optional[str] = None
    ai_summary: Optional[str] = None
    is_processed: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
