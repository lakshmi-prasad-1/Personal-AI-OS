from __future__ import annotations

from typing import Any, Dict, List


class StudyProfileEngine:
    def build_profile(self, subjects: List[str], semester: str, goals: List[str], weak_topics: List[str]) -> Dict[str, Any]:
        return {
            "subjects": subjects,
            "semester": semester,
            "study_goals": goals,
            "weak_concepts": weak_topics,
            "strong_concepts": [],
            "revision_frequency": "daily",
            "preferred_difficulty": "medium",
            "learning_speed": "steady",
        }
