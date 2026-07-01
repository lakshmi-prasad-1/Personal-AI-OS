"""Goal evaluation and progress heuristics."""

from __future__ import annotations

from typing import Any, Dict, List


class GoalEngine:
    def evaluate_progress(self, goal: Dict[str, Any], completed_tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        progress = min(100.0, max(0.0, (len(completed_tasks) / max(1, len(completed_tasks) + 2)) * 100))
        return {
            **goal,
            "progress_percent": round(progress, 2),
            "status": "completed" if progress >= 100 else "active",
        }
