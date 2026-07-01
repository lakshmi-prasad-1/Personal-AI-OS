from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.intelligence.flashcard_engine import FlashcardEngine
from app.intelligence.learning_roadmap_engine import LearningRoadmapEngine
from app.intelligence.quiz_engine import QuizEngine
from app.intelligence.resource_intelligence_engine import ResourceIntelligenceEngine
from app.intelligence.spaced_repetition_engine import SpacedRepetitionEngine
from app.intelligence.study_profile_engine import StudyProfileEngine
from app.intelligence.study_service import StudyService
from app.intelligence.tutor_engine import TutorEngine
from app.intelligence.weak_topic_engine import WeakTopicEngine
from app.models.core_models import User
from app.schemas.study import StudyProfileCreate, StudyProfileRead

router = APIRouter()
study_profile_engine = StudyProfileEngine()
resource_intelligence_engine = ResourceIntelligenceEngine()
tutor_engine = TutorEngine()
flashcard_engine = FlashcardEngine()
quiz_engine = QuizEngine()
spaced_repetition_engine = SpacedRepetitionEngine()
weak_topic_engine = WeakTopicEngine()
learning_roadmap_engine = LearningRoadmapEngine()
study_service = StudyService()


@router.post("/profile", response_model=StudyProfileRead, status_code=status.HTTP_201_CREATED)
async def create_profile(profile_in: StudyProfileCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await study_service.create_or_update_profile(db, current_user.id, profile_in)


@router.get("/profile", response_model=StudyProfileRead)
async def get_profile(current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return StudyProfileRead(id=UUID(int=0), user_id=current_user.id, semester="4th", subjects=["DSA"], study_goals=["Placement prep"], created_at=None)


@router.post("/resources/intelligence")
async def analyze_resource(text: str):
    return resource_intelligence_engine.extract_metadata(text)


@router.post("/tutor")
async def tutor(question: str, level: str = "beginner"):
    return tutor_engine.answer_question(question, level=level)


@router.post("/flashcards")
async def flashcards(topics: List[str], difficulty: str = "medium"):
    return flashcard_engine.generate_flashcards(topics, difficulty=difficulty)


@router.post("/quiz")
async def quiz(topic: str, difficulty: str = "medium"):
    return quiz_engine.generate_quiz(topic, difficulty=difficulty)


@router.post("/revision")
async def revision(topic: str, mastery: float, confidence: float):
    return spaced_repetition_engine.schedule_review(topic, mastery, confidence)


@router.post("/weak-topics")
async def weak_topics(results: List[dict]):
    return weak_topic_engine.detect(results)


@router.post("/roadmap")
async def roadmap(topic: str):
    return learning_roadmap_engine.build_roadmap(topic)
