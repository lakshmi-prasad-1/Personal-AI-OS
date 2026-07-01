from __future__ import annotations

from typing import Any, Dict


class LearningRoadmapEngine:
    def build_roadmap(self, topic: str) -> Dict[str, Any]:
        return {
            "topic": topic,
            "steps": ["Basics", "Practice", "Projects", "Revision"],
            "next_step": "Practice fundamentals",
        }
