"""Habit analytics and tracking helpers."""

from __future__ import annotations

from typing import Any, Dict, List


class HabitEngine:
    def summarize(self, habits: List[Dict[str, Any]], logs: List[Dict[str, Any]]) -> Dict[str, Any]:
        return {
            "habits": habits,
            "logs": logs,
            "completion_rate": round(sum(1 for log in logs if log.get("completed")) / max(1, len(logs)), 2),
        }
