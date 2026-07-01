import unittest
from datetime import datetime
from types import SimpleNamespace
from uuid import uuid4

from app.api.v1 import productivity
from app.main import app
from app.schemas.productivity import TaskCreate


class ApiRouteTests(unittest.TestCase):
    def test_core_routes_are_registered(self):
        paths = {route.path for route in app.routes}

        self.assertIn("/api/v1/chat/", paths)
        self.assertIn("/api/v1/memory/", paths)
        self.assertIn("/api/v1/resources/", paths)
        self.assertIn("/api/v1/notes/", paths)
        self.assertIn("/api/v1/ideas/", paths)
        self.assertIn("/api/v1/voice/command", paths)


class ProductivityRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_create_task_uses_productivity_service(self):
        user_id = uuid4()
        created_task = SimpleNamespace(
            id=uuid4(),
            user_id=user_id,
            title="Ship feature",
            description="Done",
            priority=1,
            status="todo",
            due_date=None,
            completed_at=None,
            tags=[],
            is_recurring=False,
            recurrence_rule=None,
            estimated_minutes=45,
            actual_minutes=None,
            source="manual",
            created_at=datetime.utcnow(),
            updated_at=None,
        )

        async def fake_create_task(db, user_id_arg, task_in):
            self.assertEqual(user_id_arg, user_id)
            self.assertEqual(task_in.title, "Ship feature")
            return created_task

        productivity.productivity_service = SimpleNamespace(create_task=fake_create_task)

        result = await productivity.create_task(
            task_in=TaskCreate(title="Ship feature", description="Done", priority=1, estimated_minutes=45),
            current_user=SimpleNamespace(id=user_id),
            db=None,
        )

        self.assertEqual(result.title, created_task.title)


if __name__ == "__main__":
    unittest.main()
