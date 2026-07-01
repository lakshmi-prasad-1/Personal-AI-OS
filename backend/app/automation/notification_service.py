from typing import Any, Dict, Optional
from uuid import uuid4


class NotificationService:
    def __init__(self) -> None:
        self._notifications: Dict[str, Dict[str, Any]] = {}

    def send(self, *, channel: str, title: str, body: str, priority: str = "normal", template: Optional[str] = None) -> Dict[str, Any]:
        notification_id = str(uuid4())
        notification = {
            "id": notification_id,
            "channel": channel,
            "title": title,
            "body": body,
            "priority": priority,
            "template": template,
            "status": "sent",
            "read": False,
        }
        self._notifications[notification_id] = notification
        return notification

    def mark_read(self, notification_id: str) -> Dict[str, Any]:
        notification = self._notifications[notification_id]
        notification["read"] = True
        return notification
