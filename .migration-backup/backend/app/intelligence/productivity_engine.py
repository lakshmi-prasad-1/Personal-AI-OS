from datetime import date, datetime
from typing import Any, Dict, List, Optional


def generate_plan(plan_type: str, target_date: date, tasks: Optional[List[Dict[str, Any]]] = None, preferences: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create a simple planner payload for daily, weekly, or monthly planning."""
    task_items = tasks or []
    ordered_tasks = sorted(
        task_items,
        key=lambda item: (
            item.get("status") != "todo",
            item.get("priority", 5),
            item.get("due_date") or datetime.max,
        ),
    )

    schedule = [
        {
            "title": task["title"],
            "priority": task.get("priority", 3),
            "status": task.get("status", "todo"),
            "due_date": task.get("due_date"),
        }
        for task in ordered_tasks[:5]
    ]

    return {
        "plan_type": plan_type,
        "date": target_date,
        "schedule": schedule,
        "ai_notes": "Focus on urgent tasks first and preserve recovery time.",
        "estimated_workload": "moderate" if len(schedule) >= 2 else "light",
    }


def build_daily_review_summary(completed_tasks: Optional[List[Dict[str, Any]]] = None, pending_tasks: Optional[List[Dict[str, Any]]] = None, habits: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    completed = completed_tasks or []
    pending = pending_tasks or []
    habit_items = habits or []
    habit_summary = {habit.get("name", "habit"): habit.get("completed", False) for habit in habit_items}

    return {
        "completed_count": len(completed),
        "pending_count": len(pending),
        "habit_summary": habit_summary,
        "tomorrow_plan": "Prepare the next priority task before sleeping.",
    }


def build_weekly_review_summary(tasks: Optional[List[Dict[str, Any]]] = None, goals: Optional[List[Dict[str, Any]]] = None, habits: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    task_items = tasks or []
    goal_items = goals or []
    habit_items = habits or []
    completed_tasks = sum(1 for task in task_items if task.get("status") == "done")
    completion_rate = round(completed_tasks / len(task_items), 2) if task_items else 0.0
    habits_hit = sum(1 for habit in habit_items if habit.get("completed"))

    return {
        "stats": {
            "completed_tasks": completed_tasks,
            "total_tasks": len(task_items),
            "completion_rate": completion_rate,
            "habits_hit": habits_hit,
        },
        "insights": "Momentum is strongest when urgent work is closed early in the week.",
        "recommendations": ["Protect one deep-work block tomorrow.", "Review one stalled goal before Friday."],
        "goal_progress": goal_items,
    }
