from datetime import datetime
from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.intelligence.career_coach import CareerCoachEngine
from app.intelligence.career_engine import analyze_resume_against_jd, build_dashboard, build_skill_gap_report
from app.intelligence.career_service import CareerService
from app.intelligence.interview_engine import InterviewEngine
from app.intelligence.resume_ai_engine import ResumeAIEngine
from app.models.core_models import User
from app.schemas.career import (
    ApplicationCreate,
    ApplicationDashboard,
    ApplicationRead,
    InterviewQuestionCreate,
    InterviewQuestionRead,
    MockInterviewCreate,
    MockInterviewRead,
    ResumeAIRequest,
    ResumeAIResponse,
    ResumeCreate,
    ResumeRead,
    SkillGapCreate,
    SkillGapRead,
)

router = APIRouter()
career_service = CareerService()
resume_ai_engine = ResumeAIEngine()
interview_engine = InterviewEngine()
career_coach_engine = CareerCoachEngine()


@router.post("/resumes", response_model=ResumeRead, status_code=status.HTTP_201_CREATED)
async def create_resume(resume_in: ResumeCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await career_service.create_resume(db, current_user.id, resume_in)


@router.get("/resumes", response_model=List[ResumeRead])
async def list_resumes(current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return []


@router.post("/resume-ai", response_model=ResumeAIResponse)
async def analyze_resume(request: ResumeAIRequest, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    analysis = analyze_resume_against_jd(resume_text="", job_description=request.job_description)
    variant = resume_ai_engine.build_resume_variant({"title": "Resume", "content": "", "target_role": ""}, "Target Role", request.job_description)
    return ResumeAIResponse(
        request_type=request.request_type,
        result=variant["cover_letter"],
        ats_score=variant["ats_score"],
        matched_skills=analysis["matched_skills"],
        missing_skills=variant["missing_skills"],
        suggestions=variant["suggestions"],
    )


@router.post("/applications", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
async def create_application(application_in: ApplicationCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await career_service.create_application(db, current_user.id, application_in)


@router.get("/applications", response_model=List[ApplicationRead])
async def list_applications(current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return []


@router.get("/dashboard", response_model=ApplicationDashboard)
async def get_dashboard(current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    dashboard = build_dashboard([])
    return ApplicationDashboard(**dashboard, recent=[])


@router.post("/interview-questions", response_model=InterviewQuestionRead, status_code=status.HTTP_201_CREATED)
async def create_interview_question(question_in: InterviewQuestionCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return {
        "id": UUID(int=0),
        "user_id": current_user.id,
        **question_in.model_dump(),
        "times_practiced": 0,
        "last_practiced_at": None,
        "confidence_level": None,
        "created_at": datetime.utcnow(),
    }


@router.post("/mock-interviews", response_model=MockInterviewRead, status_code=status.HTTP_201_CREATED)
async def create_mock_interview(interview_in: MockInterviewCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    feedback = interview_engine.generate_feedback(interview_in.custom_questions[0] if interview_in.custom_questions else "Tell me about yourself", "I focused on ownership and delivery")
    return {
        "id": UUID(int=0),
        "user_id": current_user.id,
        "interview_type": interview_in.interview_type,
        "questions": [],
        "responses": [],
        "ai_feedback": feedback["feedback"],
        "ai_score": 8.4,
        "strengths": feedback["strengths"],
        "improvements": feedback["improvements"],
        "duration_minutes": None,
        "created_at": datetime.utcnow(),
    }


@router.post("/skill-gaps", response_model=SkillGapRead, status_code=status.HTTP_201_CREATED)
async def create_skill_gap(skill_gap_in: SkillGapCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    report = build_skill_gap_report(skill_gap_in.target_role, skill_gap_in.current_skills, skill_gap_in.job_description or "")
    return {
        "id": UUID(int=0),
        "user_id": current_user.id,
        "target_role": skill_gap_in.target_role,
        "target_company": skill_gap_in.target_company,
        "current_skills": skill_gap_in.current_skills,
        **{k: report[k] for k in ["required_skills", "gap_analysis", "roadmap", "ai_analysis"]},
        "job_description": skill_gap_in.job_description,
        "created_at": datetime.utcnow(),
    }


@router.get("/coach")
async def career_coach(current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    recommendations = career_coach_engine.build_recommendations(["Backend Engineer"], [{"name": "Python"}], ["FastAPI project"])
    return {"recommendations": recommendations}
