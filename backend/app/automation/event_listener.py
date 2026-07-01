from typing import Any, Dict, List

from app.intelligence.global_intelligence.event_bus import EventBus, Event
from app.automation.workflow_engine import WorkflowEngine


class EventListener:
    def __init__(self, event_bus: EventBus | None = None, workflow_engine: WorkflowEngine | None = None) -> None:
        self.event_bus = event_bus or EventBus()
        self.workflow_engine = workflow_engine or WorkflowEngine()
        self._registered: List[str] = []

    def subscribe(self, topic: str) -> None:
        self.event_bus.subscribe(topic, self._handle_event)
        self._registered.append(topic)

    def _handle_event(self, event: Event) -> None:
        workflow = {
            "name": f"Auto workflow for {event.type}",
            "trigger_type": "event",
            "trigger_config": {"event_type": event.type},
            "steps": [{"action": "notify", "config": {"channel": "in_app", "title": event.type}}],
        }
        self.workflow_engine.execute_workflow(workflow, context={"event_type": event.type, "payload": event.payload})
