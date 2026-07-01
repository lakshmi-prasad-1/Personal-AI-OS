from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


def dispatch_event(event_type: str, payload: Optional[Dict[str, Any]] = None, source: str = "api") -> Dict[str, Any]:
    """Create a normalized event structure for downstream automation workflows."""
    return {
        "event_type": event_type,
        "payload": payload or {},
        "source": source,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def run_workflow(workflow: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a simple workflow definition with a sequence of steps."""
    steps = workflow.get("steps", [])
    completed_steps = []
    for step in steps:
        completed_steps.append(step.get("action", "noop"))
    return {"status": "success", "steps_completed": len(completed_steps), "result": {"actions": completed_steps}}


def create_notification(channel: str, title: str, body: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create a notification payload for email, Telegram, Discord, push, or in-app delivery."""
    return {
        "channel": channel,
        "title": title,
        "body": body,
        "status": "pending",
        "metadata": metadata or {},
    }


def build_weekly_report(tasks_completed: int, habits_completed: int, focus_hours: float) -> Dict[str, Any]:
    """Assemble a weekly report payload for automation and reporting workflows."""
    highlights = [
        f"Completed {tasks_completed} tasks this week.",
        f"Hit {habits_completed} habit targets.",
    ]
    recommendations = [
        "Protect one deep-work block next week.",
        "Keep the weekly review cadence consistent.",
    ]
    return {
        "week_start": "Monday",
        "week_end": "Sunday",
        "tasks_completed": tasks_completed,
        "habits_completed": habits_completed,
        "focus_hours": focus_hours,
        "notes_created": 0,
        "memories_stored": 0,
        "resources_added": 0,
        "applications_sent": 0,
        "ai_insights": "Automation insights are available for review.",
        "highlights": highlights,
        "recommendations": recommendations,
    }
