from __future__ import annotations

from typing import Any, Dict, List


class CareerCoachEngine:
    def build_recommendations(self, goals: List[str], skills: List[Dict[str, Any]], recent_projects: List[str]) -> List[Dict[str, Any]]:
        return [
            {
                "action": "learn",
                "title": "Strengthen system design fundamentals",
                "detail": "Review distributed systems and design tradeoffs before your next application wave.",
            },
            {
                "action": "resume",
                "title": "Refresh your resume",
                "detail": "Add your latest project outcomes and metrics to your active resume.",
            },
            {
                "action": "interview",
                "title": "Practice behavioral stories",
                "detail": "Prepare three STAR-format stories for interviews this week.",
            },
        ]
