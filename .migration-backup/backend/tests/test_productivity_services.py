import unittest
from datetime import date, datetime, timedelta

from app.intelligence.productivity_engine import (
    build_daily_review_summary,
    build_weekly_review_summary,
    generate_plan,
)


class ProductivityServicesTests(unittest.TestCase):
    def test_generate_plan_prioritizes_due_and_high_priority_items(self):
        tasks = [
            {"title": "Ship feature", "priority": 1, "due_date": datetime.utcnow() + timedelta(days=1), "status": "todo"},
            {"title": "Reply to email", "priority": 3, "due_date": datetime.utcnow() + timedelta(days=10), "status": "todo"},
        ]

        plan = generate_plan("daily", date.today(), tasks=tasks)

        self.assertEqual(plan["plan_type"], "daily")
        self.assertGreaterEqual(len(plan["schedule"]), 1)
        self.assertEqual(plan["schedule"][0]["title"], "Ship feature")

    def test_build_daily_review_summary_includes_completed_and_pending(self):
        review = build_daily_review_summary(
            completed_tasks=[{"title": "Write report"}],
            pending_tasks=[{"title": "Study Docker"}],
            habits=[{"name": "Coding", "completed": True}],
        )

        self.assertEqual(review["completed_count"], 1)
        self.assertEqual(review["pending_count"], 1)
        self.assertEqual(review["habit_summary"]["Coding"], True)

    def test_build_weekly_review_summary_generates_insights(self):
        review = build_weekly_review_summary(
            tasks=[{"status": "done"}, {"status": "todo"}, {"status": "done"}],
            goals=[{"status": "active"}, {"status": "completed"}],
            habits=[{"completed": True}, {"completed": False}],
        )

        self.assertIn("insights", review)
        self.assertIn("recommendations", review)
        self.assertGreaterEqual(review["stats"]["completion_rate"], 0)


if __name__ == "__main__":
    unittest.main()
