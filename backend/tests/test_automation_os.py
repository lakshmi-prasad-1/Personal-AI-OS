import asyncio
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch
from uuid import uuid4

from app.api.v1 import automation as automation_routes
from app.api.v1.auth import login_access_token
from app.api.deps import get_current_active_user
from app.automation.audit_logger import AuditLogger
from app.automation.event_listener import EventListener
from app.automation.integration_manager import IntegrationManager
from app.automation.notification_service import NotificationService
from app.automation.retry_manager import RetryManager
from app.automation.scheduler import Scheduler
from app.automation.services.connector import Connector
from app.automation.webhook_service import WebhookService
from app.automation.workflow_engine import WorkflowEngine
from app.intelligence.global_intelligence.event_bus import EventBus, Event
from app.schemas.automation import BackupCreate, EventCreate, NotificationCreate, WebhookCreate, WorkflowCreate


class AutomationOSTests(unittest.TestCase):
    def test_workflow_engine_executes_event_workflow_and_logs_history(self):
        engine = WorkflowEngine()
        workflow = {
            "name": "Study reminder",
            "description": "Notify the user when a weak topic is detected",
            "trigger_type": "event",
            "trigger_config": {"event_type": "WeakTopicDetected"},
            "steps": [{"action": "notify", "config": {"channel": "in_app", "title": "Study reminder"}}],
        }

        result = engine.execute_workflow(workflow, context={"event_type": "WeakTopicDetected"})

        self.assertEqual(result["status"], "success")
        self.assertEqual(len(engine.history), 1)
        self.assertEqual(engine.history[0]["workflow_name"], "Study reminder")

    def test_retry_manager_retries_until_success(self):
        attempts = {"count": 0}

        def flaky_action():
            attempts["count"] += 1
            if attempts["count"] < 3:
                raise RuntimeError("boom")
            return "ok"

        manager = RetryManager(max_retries=3, base_delay=0)
        result = manager.run_with_retry(flaky_action)

        self.assertEqual(result, "ok")
        self.assertEqual(attempts["count"], 3)

    def test_notification_service_sends_and_marks_read(self):
        service = NotificationService()
        notification = service.send(
            channel="email",
            title="Interview reminder",
            body="You have an interview tomorrow",
            priority="high",
            template="interview",
        )

        self.assertEqual(notification["status"], "sent")
        self.assertEqual(notification["priority"], "high")

        updated = service.mark_read(notification["id"])
        self.assertTrue(updated["read"])

    def test_webhook_service_verifies_signature(self):
        service = WebhookService(secret="shared-secret")
        payload = b'{"event": "job.matched"}'
        signature = service.sign(payload)

        self.assertTrue(service.verify_signature(payload, signature))
        self.assertFalse(service.verify_signature(payload, "bad-signature"))

    def test_event_listener_reacts_to_event_bus_messages(self):
        event_bus = EventBus()
        workflow_engine = WorkflowEngine()
        listener = EventListener(event_bus=event_bus, workflow_engine=workflow_engine)
        listener.subscribe("WeakTopicDetected")

        event_bus.publish(Event("WeakTopicDetected", {"topic": "Docker"}))

        self.assertEqual(len(workflow_engine.history), 1)
        self.assertEqual(workflow_engine.history[0]["trigger_type"], "event")

    def test_scheduler_supports_delayed_and_one_time_jobs(self):
        scheduler = Scheduler()
        delayed = scheduler.schedule_delayed("digest", 0)
        once = scheduler.schedule_once("reminder", scheduler.jobs[0].run_at)

        self.assertEqual(delayed.name, "digest")
        self.assertEqual(once.name, "reminder")
        self.assertEqual(len(scheduler.jobs), 2)

    def test_audit_logger_records_entries(self):
        logger = AuditLogger()
        entry = logger.log("workflow.executed", {"workflow": "study"})

        self.assertEqual(entry["action"], "workflow.executed")
        self.assertEqual(len(logger.entries), 1)

    def test_connector_abstraction_supports_mocked_provider_ops(self):
        connector = Connector()
        provider = Mock()
        provider.authenticate.return_value = {"status": "authenticated"}
        provider.fetch.return_value = {"status": "fetched"}

        self.assertEqual(connector.authenticate({"token": "abc"})["status"], "authenticated")
        self.assertEqual(connector.fetch({"q": "jobs"})["status"], "fetched")

    def test_integration_manager_registers_and_reports_provider_health(self):
        manager = IntegrationManager()
        manager.register_provider("gmail", {"health": "ok"})
        self.assertEqual(manager.health()["gmail"], "ok")
        self.assertEqual(manager.sync("gmail", {"event": "email"})["status"], "synced")

    def test_automation_api_routes_expose_workflows_notifications_and_reports(self):
        current_user = SimpleNamespace(id=uuid4())
        event = automation_routes.emit_event(EventCreate(event_type="task.completed", payload={"task_id": "123"}, source="api"), current_user=current_user, db=None)
        workflow = automation_routes.create_workflow(WorkflowCreate(name="Daily digest", description="Summarize", trigger_type="schedule", trigger_config={"cron": "0 8 * * *"}, steps=[{"action": "notify"}]), current_user=current_user, db=None)
        notification = automation_routes.send_notification(NotificationCreate(channel="email", title="Digest", body="Hello"), current_user=current_user, db=None)
        webhook = automation_routes.create_webhook(WebhookCreate(name="Pulse", description="Webhook", path="pulse", trigger_workflow_id=None), current_user=current_user, db=None)
        backup = automation_routes.create_backup(BackupCreate(backup_type="notes", storage_provider="local"), current_user=current_user, db=None)
        weekly = automation_routes.weekly_report(current_user=current_user, db=None)

        self.assertEqual(event.event_type, "task.completed")
        self.assertEqual(workflow["name"], "Daily digest")
        self.assertEqual(notification.channel, "email")
        self.assertEqual(webhook["path"], "pulse")
        self.assertEqual(backup["status"], "completed")
        self.assertGreaterEqual(len(weekly.highlights), 1)

    def test_login_route_returns_token_for_valid_credentials(self):
        async def run_test():
            with patch("app.api.v1.auth.user_repo.get_user_by_email", new=AsyncMock(return_value=SimpleNamespace(email="a@example.com", password_hash="hash", id=uuid4()))), patch("app.api.v1.auth.verify_password", return_value=True), patch("app.api.v1.auth.create_access_token", return_value="token"):
                form_data = SimpleNamespace(username="a@example.com", password="secret")
                response = await login_access_token(form_data, db=Mock())
                self.assertEqual(response["access_token"], "token")

        asyncio.run(run_test())

    def test_get_current_active_user_rejects_inactive_accounts(self):
        with self.assertRaises(Exception):
            asyncio.run(get_current_active_user(SimpleNamespace(is_active=False)))


if __name__ == "__main__":
    unittest.main()
