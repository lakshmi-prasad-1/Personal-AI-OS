from enum import Enum
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class MemoryCategory(str, Enum):
    GOALS = "Goals"
    SKILLS = "Skills"
    RESUME = "Resume"
    CAREER = "Career"
    COMPANIES = "Companies"
    DAILY_NOTES = "DailyNotes"
    CODING_PROGRESS = "CodingProgress"
    LEETCODE_PROGRESS = "LeetCodeProgress"
    RANDOM = "Random"


class MemoryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    category: MemoryCategory
    tags: List[str] = []
    importance_score: float = Field(default=0.5, ge=0.0, le=1.0)
    confidence_score: float = Field(default=1.0, ge=0.0, le=1.0)


class MemoryUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    category: Optional[MemoryCategory] = None
    tags: Optional[List[str]] = None
    importance_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)
    is_archived: Optional[bool] = None


class MemoryRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: str
    category: str
    tags: List[str] = []
    importance_score: float
    confidence_score: float
    is_archived: bool
    source_message_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Used by AI extraction pipeline
class MemoryExtractedItem(BaseModel):
    title: str
    description: str
    category: str = Field(..., description="e.g., Goals, Skills, Career, Companies, Random")
    tags: List[str]
    importance_score: float = Field(..., ge=0.0, le=1.0)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    action: str = Field(..., description="Create, Update, Merge, or Ignore")


class MemoryExtractionResult(BaseModel):
    memories: List[MemoryExtractedItem]


class MemorySearchResult(BaseModel):
    id: str
    title: str
    description: str
    category: str
    similarity: float
    importance_score: float
    tags: List[str] = []
