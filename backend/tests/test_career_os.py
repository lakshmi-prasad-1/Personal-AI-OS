import unittest
from datetime import datetime
from uuid import uuid4

from app.intelligence.career_coach import CareerCoachEngine
from app.intelligence.career_engine import analyze_resume_against_jd, build_dashboard, build_skill_gap_report
from app.intelligence.interview_engine import InterviewEngine
from app.intelligence.resume_ai_engine import ResumeAIEngine
from app.intelligence.career_service import CareerService
from app.schemas.career import ApplicationCreate, ResumeCreate


class CareerOsTests(unittest.TestCase):
    def test_resume_ai_engine_creates_versioned_copy_without_overwriting(self):
        engine = ResumeAIEngine()
        resume = {"title": "Backend Engineer", "content": "Built APIs", "target_role": "Backend Engineer"}

        result = engine.build_resume_variant(resume, "Senior Backend Engineer", job_description="Build FastAPI services")

        self.assertEqual(result["version"], 2)
        self.assertEqual(result["title"], "Backend Engineer - Senior Backend Engineer")
        self.assertIn("cover_letter", result)
        self.assertNotEqual(result["content"], resume["content"])

    def test_skill_gap_report_lists_missing_skills_and_roadmap(self):
        report = build_skill_gap_report(
            "Microsoft SWE",
            [{"name": "Python"}, {"name": "FastAPI"}],
            "Need Docker Redis Azure System Design",
        )

        self.assertGreaterEqual(len(report["gap_analysis"]), 1)
        self.assertGreaterEqual(len(report["roadmap"]), 1)
        self.assertIn("Docker", [skill["name"] for skill in report["required_skills"]])

    def test_dashboard_calculates_application_rates(self):
        dashboard = build_dashboard([
            {"status": "applied"},
            {"status": "interview"},
            {"status": "offer"},
        ])

        self.assertEqual(dashboard["total"], 3)
        self.assertEqual(dashboard["by_status"]["interview"], 1)
        self.assertGreaterEqual(dashboard["success_rate"], 0)

    def test_interview_engine_generates_feedback(self):
        engine = InterviewEngine()
        feedback = engine.generate_feedback("Tell me about a conflict", "I learned to communicate better")

        self.assertIn("behavioral", feedback["category"])
        self.assertIn("feedback", feedback)

    def test_career_coach_recommends_resume_and_learning(self):
        engine = CareerCoachEngine()
        recommendations = engine.build_recommendations(
            goals=["Backend Engineer"],
            skills=[{"name": "Python"}],
            recent_projects=["FastAPI service"],
        )

        self.assertGreaterEqual(len(recommendations), 2)
        self.assertIn("learn", recommendations[0]["action"].lower())

    def test_resume_service_persists_resume_and_application(self):
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

        service = CareerService()
        session = FakeSession()
        user_id = uuid4()
        resume = asyncio_run(service.create_resume(session, user_id, ResumeCreate(title="Resume", content="Built APIs", target_role="Backend Engineer")))
        application = asyncio_run(service.create_application(session, user_id, ApplicationCreate(company="Google", role="SWE Intern", status="applied"), resume_id=resume.id))

        self.assertEqual(resume.user_id, user_id)
        self.assertEqual(application.company, "Google")
        self.assertEqual(session.committed, 2)


def asyncio_run(coro):
    import asyncio
    return asyncio.run(coro)


if __name__ == "__main__":
    unittest.main()
