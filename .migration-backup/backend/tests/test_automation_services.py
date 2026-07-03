import unittest

from app.intelligence.automation_engine import (
    dispatch_event,
    run_workflow,
    create_notification,
    build_weekly_report,
)


class AutomationServicesTests(unittest.TestCase):
    def test_dispatch_event_creates_event_payload(self):
        event = dispatch_event("task.completed", {"task_id": "123"}, source="api")
        self.assertEqual(event["event_type"], "task.completed")
        self.assertTrue(event["payload"], {"task_id": "123"})

    def test_run_workflow_executes_steps(self):
        workflow = {"steps": [{"action": "notify", "config": {"channel": "email"}}]}
        result = run_workflow(workflow)
        self.assertEqual(result["status"], "success")

    def test_create_notification_uses_channel_payload(self):
        notification = create_notification("email", "Daily digest", "Hello")
        self.assertEqual(notification["channel"], "email")
        self.assertIn("metadata", notification)

    def test_build_weekly_report_returns_summary(self):
        report = build_weekly_report(tasks_completed=3, habits_completed=2, focus_hours=8.5)
        self.assertIn("highlights", report)
        self.assertIn("recommendations", report)


if __name__ == "__main__":
    unittest.main()
