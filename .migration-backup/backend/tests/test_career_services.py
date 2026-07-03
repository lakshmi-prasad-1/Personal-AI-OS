import unittest
from datetime import datetime, timedelta

from app.intelligence.career_engine import analyze_resume_against_jd, build_skill_gap_report, build_dashboard


class CareerServicesTests(unittest.TestCase):
    def test_analyze_resume_against_jd_returns_match_and_recommendations(self):
        result = analyze_resume_against_jd(
            resume_text="Python FastAPI SQLAlchemy PostgreSQL",
            job_description="Need Python backend engineer with FastAPI and SQLAlchemy",
        )

        self.assertGreaterEqual(result["ats_score"], 0)
        self.assertIn("matched_skills", result)
        self.assertIn("missing_skills", result)

    def test_build_skill_gap_report_includes_roadmap(self):
        report = build_skill_gap_report(
            target_role="Software Engineer",
            current_skills=[{"name": "Python", "proficiency": 4}],
            job_description="Need FastAPI, Docker, AWS",
        )

        self.assertEqual(report["target_role"], "Software Engineer")
        self.assertIn("roadmap", report)
        self.assertGreaterEqual(len(report["roadmap"]), 1)

    def test_build_dashboard_summarizes_applications(self):
        dashboard = build_dashboard(
            applications=[
                {"status": "interview"},
                {"status": "rejected"},
                {"status": "offer"},
            ]
        )

        self.assertEqual(dashboard["total"], 3)
        self.assertGreaterEqual(dashboard["success_rate"], 0)


if __name__ == "__main__":
    unittest.main()
