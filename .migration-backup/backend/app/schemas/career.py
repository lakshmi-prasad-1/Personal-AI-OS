from enum import Enum
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Resume Schemas
# ---------------------------------------------------------------------------
class ResumeCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    content: Optional[str] = None
    structured_data: Dict[str, Any] = {}
    target_role: Optional[str] = None


class ResumeUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None
    target_role: Optional[str] = None
    is_active: Optional[bool] = None


class ResumeRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    content: Optional[str] = None
    structured_data: Dict[str, Any] = {}
    version: int
    ats_score: Optional[float] = None
    ats_feedback: List[Any] = []
    file_path: Optional[str] = None
    is_active: bool
    target_role: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ResumeAIRequest(BaseModel):
    """Request to AI-analyze resume against a job description."""
    resume_id: UUID
    job_description: str = Field(..., min_length=50)
    request_type: str = Field(
        default="optimize",
        description="optimize, cover_letter, skill_match, ats_score"
    )


class ResumeAIResponse(BaseModel):
    request_type: str
    result: str
    ats_score: Optional[float] = None
    matched_skills: List[str] = []
    missing_skills: List[str] = []
    suggestions: List[str] = []


# ---------------------------------------------------------------------------
# Application Tracker Schemas
# ---------------------------------------------------------------------------
class ApplicationStatus(str, Enum):
    APPLIED = "applied"
    INTERVIEW = "interview"
    OA = "oa"
    OFFER = "offer"
    REJECTED = "rejected"
    PENDING = "pending"
    WITHDRAWN = "withdrawn"


class ApplicationCreate(BaseModel):
    company: str = Field(..., min_length=1, max_length=200)
    role: str = Field(..., min_length=1, max_length=200)
    status: ApplicationStatus = ApplicationStatus.APPLIED
    applied_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    job_description: Optional[str] = None
    job_url: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    notes: Optional[str] = None
    resume_id: Optional[UUID] = None


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    deadline: Optional[datetime] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[datetime] = None
    cover_letter: Optional[str] = None
    salary_range: Optional[str] = None


class ApplicationRead(BaseModel):
    id: UUID
    user_id: UUID
    company: str
    role: str
    status: str
    applied_at: Optional[datetime] = None
    deadline: Optional[datetime] = None
    job_url: Optional[str] = None
    source: Optional[str] = None
    location: Optional[str] = None
    salary_range: Optional[str] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[datetime] = None
    timeline: List[Dict[str, Any]] = []
    ai_match_score: Optional[float] = None
    resume_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApplicationDashboard(BaseModel):
    total: int
    by_status: Dict[str, int]
    success_rate: float
    interview_rate: float
    recent: List[ApplicationRead]


# ---------------------------------------------------------------------------
# Interview Prep Schemas
# ---------------------------------------------------------------------------
class QuestionCategory(str, Enum):
    BEHAVIORAL = "behavioral"
    CODING = "coding"
    SYSTEM_DESIGN = "system_design"


class InterviewQuestionCreate(BaseModel):
    category: QuestionCategory
    subcategory: Optional[str] = None
    question: str = Field(..., min_length=5)
    answer: Optional[str] = None
    difficulty: str = Field(default="medium", pattern="^(easy|medium|hard)$")
    tags: List[str] = []
    source: Optional[str] = None


class InterviewQuestionUpdate(BaseModel):
    answer: Optional[str] = None
    difficulty: Optional[str] = None
    tags: Optional[List[str]] = None
    confidence_level: Optional[int] = Field(None, ge=1, le=5)


class InterviewQuestionRead(BaseModel):
    id: UUID
    user_id: UUID
    category: str
    subcategory: Optional[str] = None
    question: str
    answer: Optional[str] = None
    difficulty: str
    tags: List[str] = []
    source: Optional[str] = None
    times_practiced: int
    last_practiced_at: Optional[datetime] = None
    confidence_level: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MockInterviewCreate(BaseModel):
    interview_type: str
    question_ids: List[UUID] = []
    custom_questions: List[str] = []


class MockInterviewRead(BaseModel):
    id: UUID
    user_id: UUID
    interview_type: str
    questions: List[Dict[str, Any]] = []
    responses: List[Dict[str, Any]] = []
    ai_feedback: Optional[str] = None
    ai_score: Optional[float] = None
    strengths: List[str] = []
    improvements: List[str] = []
    duration_minutes: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Skill Gap Schemas
# ---------------------------------------------------------------------------
class SkillGapCreate(BaseModel):
    target_role: str = Field(..., min_length=1)
    target_company: Optional[str] = None
    job_description: Optional[str] = None
    current_skills: List[Dict[str, Any]] = []


class SkillGapRead(BaseModel):
    id: UUID
    user_id: UUID
    target_role: str
    target_company: Optional[str] = None
    current_skills: List[Dict[str, Any]] = []
    required_skills: List[Dict[str, Any]] = []
    gap_analysis: List[Dict[str, Any]] = []
    roadmap: List[Dict[str, Any]] = []
    ai_analysis: Optional[str] = None
    job_description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
