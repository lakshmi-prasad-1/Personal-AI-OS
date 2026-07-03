"""Planner and scheduling heuristics for the productivity OS."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional


class PlannerEngine:
    """Generate simple daily/weekly/monthly plans from tasks and preferences."""

    def build_plan(self, plan_type: str, target_date: Optional[date], tasks: Optional[List[Dict[str, Any]]] = None, preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        task_items = tasks or []
        ordered = sorted(
            task_items,
            key=lambda item: (
                item.get("status") == "done",
                item.get("priority", 5),
                item.get("due_date") or datetime.max,
            ),
        )

        schedule = []
        for task in ordered[:6]:
            schedule.append({
                "title": task.get("title", "Untitled task"),
                "priority": task.get("priority", 3),
                "status": task.get("status", "todo"),
                "due_date": task.get("due_date"),
                "suggested_window": self._suggest_window(plan_type, task),
            })

        return {
            "plan_type": plan_type,
            "date": target_date or date.today(),
            "schedule": schedule,
            "ai_notes": "Rebalance tasks around deadlines, college commitments, and active projects.",
            "estimated_workload": "heavy" if len(schedule) >= 4 else "moderate" if schedule else "light",
        }

    def _suggest_window(self, plan_type: str, task: Dict[str, Any]) -> str:
        if plan_type == "daily":
            return "Today"
        if plan_type == "weekly":
            return "This week"
        return "This month"
