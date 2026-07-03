"""Heuristics for classifying memories into structured categories."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Union


class MemoryClassifier:
    """Classify a user statement or memory item into a V2 memory category."""

    def __init__(self) -> None:
        self._skill_keywords = ["learn", "learning", "study", "practice", "improve", "skill", "docker", "python", "react", "node", "sql", "system design"]
        self._goal_keywords = ["goal", "want", "plan", "aspire", "internship", "job", "career", "dream", "by august", "by next"]
        self._company_keywords = ["microsoft", "google", "amazon", "meta", "apple", "netflix", "startup"]
        self._project_keywords = ["project", "build", "shipping", "app", "website", "prototype"]
        self._book_keywords = ["book", "read", "reading", "chapter"]
        self._interview_keywords = ["interview", "resume", "application", "offer"]

    def classify(self, text: Union[str, Dict[str, Any], None]) -> Dict[str, Any]:
        if not text:
            return {"category": "Unknown", "importance": 0.4, "confidence": 0.3, "tags": []}

        if isinstance(text, dict):
            combined = " ".join(str(text.get(key, "")) for key in ["title", "description", "category"] if text.get(key))
        else:
            combined = str(text)

        lowered = combined.lower()
        category = self._infer_category(lowered)
        importance = self._infer_importance(lowered, category)
        confidence = min(0.99, max(0.3, 0.5 + importance * 0.1))
        tags = self._infer_tags(lowered)
        return {"category": category, "importance": round(importance, 2), "confidence": round(confidence, 2), "tags": tags}

    def _infer_category(self, lowered: str) -> str:
        if any(keyword in lowered for keyword in self._skill_keywords):
            return "Skill"
        if any(keyword in lowered for keyword in self._goal_keywords):
            return "Goal"
        if any(keyword in lowered for keyword in self._company_keywords):
            return "Company"
        if any(keyword in lowered for keyword in self._project_keywords):
            return "Project"
        if any(keyword in lowered for keyword in self._book_keywords):
            return "Book"
        if any(keyword in lowered for keyword in self._interview_keywords):
            return "Interview"
        return "Unknown"

    def _infer_importance(self, lowered: str, category: str) -> float:
        score = 0.45
        if category != "Unknown":
            score += 0.2
        if any(word in lowered for word in ["important", "really", "seriously", "future", "career", "internship", "goal"]):
            score += 0.15
        if any(word in lowered for word in ["today", "now", "currently", "learning"]):
            score += 0.1
        return min(1.0, score)

    def _infer_tags(self, lowered: str) -> List[str]:
        tags: List[str] = []
        for keyword in ["docker", "python", "react", "node", "internship", "career", "book", "interview", "goal", "project"]:
            if keyword in lowered:
                tags.append(keyword)
        return tags
