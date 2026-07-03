import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, func, Float, ForeignKey, Boolean, Integer, Text, JSON
from sqlalchemy.orm import relationship
from app.models.base import Base
from app.core.database import is_sqlite

try:
    from sqlalchemy.dialects.postgresql import UUID, TEXT, JSONB
    use_postgres_types = True
except Exception:
    from sqlalchemy import Uuid as UUID, Text as TEXT
    use_postgres_types = False

# Use JSON instead of JSONB for SQLite compatibility
if is_sqlite or not use_postgres_types:
    JSONB = JSON  # type: ignore


# ---------------------------------------------------------------------------
# Resume Manager
# ---------------------------------------------------------------------------
class Resume(Base):
    __tablename__ = "resumes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)          # e.g. "SWE Intern - Google v2"
    content = Column(TEXT, nullable=True)           # Raw text content
    structured_data = Column(JSONB, default=dict)   # Parsed sections: experience, education, skills
    version = Column(Integer, default=1)
    ats_score = Column(Float, nullable=True)        # 0-100
    ats_feedback = Column(JSONB, default=list)      # [{issue, suggestion}]
    file_path = Column(String, nullable=True)       # Uploaded PDF path
    is_active = Column(Boolean, default=True)       # The "default" resume
    target_role = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    applications = relationship("Application", back_populates="resume")


# ---------------------------------------------------------------------------
# Internship / Job Application Tracker
# ---------------------------------------------------------------------------
class Application(Base):
    __tablename__ = "applications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    company = Column(String, nullable=False, index=True)
    role = Column(String, nullable=False)
    # status: applied, interview, oa (online assessment), offer, rejected, pending, withdrawn
    status = Column(String, default="applied", index=True)
    applied_at = Column(DateTime(timezone=True), nullable=True)
    deadline = Column(DateTime(timezone=True), nullable=True)
    job_description = Column(TEXT, nullable=True)
    job_url = Column(String, nullable=True)
    source = Column(String, nullable=True)         # LinkedIn, Wellfound, Internshala, etc.
    location = Column(String, nullable=True)
    salary_range = Column(String, nullable=True)
    notes = Column(TEXT, nullable=True)
    next_action = Column(String, nullable=True)
    next_action_date = Column(DateTime(timezone=True), nullable=True)
    # Timeline of status changes
    timeline = Column(JSONB, default=list)         # [{status, date, notes}]
    cover_letter = Column(TEXT, nullable=True)
    ai_match_score = Column(Float, nullable=True)  # AI-calculated match %
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    resume = relationship("Resume", back_populates="applications")


# ---------------------------------------------------------------------------
# Interview Preparation
# ---------------------------------------------------------------------------
class InterviewQuestion(Base):
    __tablename__ = "interview_questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String, nullable=False, index=True)  # behavioral, coding, system_design
    subcategory = Column(String, nullable=True)            # e.g. "arrays", "leadership"
    question = Column(TEXT, nullable=False)
    answer = Column(TEXT, nullable=True)
    difficulty = Column(String, default="medium")          # easy, medium, hard
    tags = Column(JSONB, default=list)
    source = Column(String, nullable=True)                 # company, leetcode, custom
    times_practiced = Column(Integer, default=0)
    last_practiced_at = Column(DateTime(timezone=True), nullable=True)
    confidence_level = Column(Integer, nullable=True)      # 1-5
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MockInterview(Base):
    __tablename__ = "mock_interviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    interview_type = Column(String, nullable=False)        # behavioral, coding, system_design, mixed
    questions = Column(JSONB, default=list)                # [{question_id, question_text}]
    responses = Column(JSONB, default=list)                # [{question_id, response_text, time_taken}]
    ai_feedback = Column(TEXT, nullable=True)
    ai_score = Column(Float, nullable=True)                # 0-10
    strengths = Column(JSONB, default=list)
    improvements = Column(JSONB, default=list)
    duration_minutes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Skill Gap Analyzer
# ---------------------------------------------------------------------------
class SkillGap(Base):
    __tablename__ = "skill_gaps"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_role = Column(String, nullable=False)
    target_company = Column(String, nullable=True)
    current_skills = Column(JSONB, default=list)           # [{name, proficiency, years}]
    required_skills = Column(JSONB, default=list)          # [{name, importance, proficiency_needed}]
    gap_analysis = Column(JSONB, default=list)             # [{skill, gap_level, resources}]
    roadmap = Column(JSONB, default=list)                  # [{week, tasks, resources, milestones}]
    ai_analysis = Column(TEXT, nullable=True)
    job_description = Column(TEXT, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ---------------------------------------------------------------------------
# Career Plan (Daily Recommendations & Learning Path)
# ---------------------------------------------------------------------------
class CareerPlan(Base):
    __tablename__ = "career_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    plan_type = Column(String, default="learning_path")    # learning_path, weekly_target, daily_recommendation
    content = Column(JSONB, nullable=False)                # Structured plan data
    ai_generated = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    valid_until = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
