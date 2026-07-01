"""Reminder engine with basic parsing for one-off and recurring reminders."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List


class ReminderEngine:
    def parse(self, text: str) -> Dict[str, Any]:
        lowered = text.lower()
        remind_at = datetime.utcnow() + timedelta(hours=1)
        recurring = False
        rule = None
        if "tomorrow" in lowered:
            remind_at = datetime.utcnow() + timedelta(days=1)
        elif "every wednesday" in lowered:
            recurring = True
            rule = "FREQ=WEEKLY;BYDAY=WE"
        elif "every month" in lowered:
            recurring = True
            rule = "FREQ=MONTHLY"

        return {
            "title": text.strip()[:80],
            "body": text,
            "remind_at": remind_at,
            "is_recurring": recurring,
            "recurrence_rule": rule,
        }
