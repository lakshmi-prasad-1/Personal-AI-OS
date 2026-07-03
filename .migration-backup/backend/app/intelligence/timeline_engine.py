"""Build chronological timelines from user activity."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional


class TimelineEngine:
    """Order memories and events into a chronological timeline."""

    def build_timeline(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized: List[Dict[str, Any]] = []
        for item in items:
            created_at = self._parse_datetime(item.get("created_at"))
            normalized.append({**item, "created_at": created_at})
        normalized.sort(key=lambda entry: entry["created_at"])
        return normalized

    def _parse_datetime(self, value: Optional[Any]) -> datetime:
        if isinstance(value, datetime):
            return value
        if not value:
            return datetime.utcnow()
        if isinstance(value, str):
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return datetime.utcnow()
        return datetime.utcnow()
