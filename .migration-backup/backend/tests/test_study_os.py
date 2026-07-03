import unittest
from uuid import uuid4

from app.intelligence.study_profile_engine import StudyProfileEngine
from app.intelligence.resource_intelligence_engine import ResourceIntelligenceEngine
from app.intelligence.tutor_engine import TutorEngine
from app.intelligence.flashcard_engine import FlashcardEngine
from app.intelligence.quiz_engine import QuizEngine
from app.intelligence.spaced_repetition_engine import SpacedRepetitionEngine
from app.intelligence.weak_topic_engine import WeakTopicEngine
from app.intelligence.learning_roadmap_engine import LearningRoadmapEngine
from app.intelligence.study_service import StudyService
from app.schemas.study import StudyProfileCreate


class StudyOsTests(unittest.TestCase):
    def test_study_profile_engine_builds_profile(self):
        engine = StudyProfileEngine()
        profile = engine.build_profile(
            subjects=["DSA", "System Design"],
            semester="4th",
            goals=["Prepare for placements"],
            weak_topics=["Graphs"],
        )

        self.assertEqual(profile["semester"], "4th")
        self.assertIn("DSA", profile["subjects"])
        self.assertIn("Graphs", profile["weak_concepts"])

    def test_resource_intelligence_extracts_metadata(self):
        engine = ResourceIntelligenceEngine()
        metadata = engine.extract_metadata("Docker and Kubernetes for backend engineering")

        self.assertIn("topics", metadata)
        self.assertIn("Docker", metadata["technologies"])
        self.assertGreaterEqual(metadata["estimated_study_time"], 1)

    def test_tutor_engine_explains_concept(self):
        engine = TutorEngine()
        response = engine.answer_question("What is a linked list?", level="beginner")

        self.assertIn("linked list", response["answer"].lower())
        self.assertIn("example", response)

    def test_flashcard_engine_creates_cards(self):
        engine = FlashcardEngine()
        cards = engine.generate_flashcards(["Recursion", "Binary Search"], difficulty="medium")

        self.assertEqual(len(cards), 2)
        self.assertIn("front", cards[0])
        self.assertIn("back", cards[0])

    def test_quiz_engine_generates_questions(self):
        engine = QuizEngine()
        quiz = engine.generate_quiz("Graphs", difficulty="medium")

        self.assertEqual(quiz["topic"], "Graphs")
        self.assertGreaterEqual(len(quiz["questions"]), 1)

    def test_spaced_repetition_schedules_next_review(self):
        engine = SpacedRepetitionEngine()
        schedule = engine.schedule_review("Graphs", mastery=0.4, confidence=0.5)

        self.assertGreaterEqual(schedule["next_review_days"], 1)
        self.assertIn("status", schedule)

    def test_weak_topic_detector_identifies_weak_topics(self):
        engine = WeakTopicEngine()
        weak = engine.detect([{"topic": "Graphs", "score": 0.35}, {"topic": "Trees", "score": 0.8}])

        self.assertEqual(weak[0]["topic"], "Graphs")

    def test_learning_roadmap_engine_builds_path(self):
        engine = LearningRoadmapEngine()
        roadmap = engine.build_roadmap("DSA")

        self.assertEqual(roadmap["topic"], "DSA")
        self.assertGreaterEqual(len(roadmap["steps"]), 3)

    def test_study_service_persists_profile(self):
        class FakeSession:
            def __init__(self):
                self.added = []
                self.committed = 0

            async def add(self, instance):
                self.added.append(instance)

            async def commit(self):
                self.committed += 1

            async def refresh(self, instance):
                return None

        service = StudyService()
        session = FakeSession()
        profile = asyncio_run(service.create_or_update_profile(
            session,
            uuid4(),
            StudyProfileCreate(subjects=["DSA"], semester="4th", study_goals=["Placement prep"]),
        ))

        self.assertEqual(profile.current_semester, "4th")
        self.assertEqual(session.committed, 1)


def asyncio_run(coro):
    import asyncio
    return asyncio.run(coro)


if __name__ == "__main__":
    unittest.main()
