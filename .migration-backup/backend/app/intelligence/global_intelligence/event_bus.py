from typing import Any, Callable, Dict, List

from app.intelligence.global_intelligence.event_models import Event


class EventBus:
    def __init__(self) -> None:
        self._subscribers: Dict[str, List[Callable[[Event], None]]] = {}

    def subscribe(self, topic: str, handler: Callable[[Event], None]) -> None:
        self._subscribers.setdefault(topic, []).append(handler)

    def publish(self, event: Event) -> None:
        for handler in self._subscribers.get(event.type, []):
            handler(event)
