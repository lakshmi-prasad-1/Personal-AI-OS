from typing import Any, Dict, List


class TimelineEngine:
    def __init__(self) -> None:
        self._events: List[Dict[str, Any]] = []

    def add_event(self, event_type: str, description: str, metadata: Dict[str, Any] | None = None) -> List[Dict[str, Any]]:
        self._events.append({
            "event_type": event_type,
            "description": description,
            "metadata": metadata or {},
        })
        return self._events
