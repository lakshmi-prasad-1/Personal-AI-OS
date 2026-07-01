from __future__ import annotations

from typing import Any, Dict


class SpacedRepetitionEngine:
    def schedule_review(self, topic: str, mastery: float, confidence: float) -> Dict[str, Any]:
        next_review_days = 1 if mastery < 0.5 else 3 if mastery < 0.8 else 7
        return {
            "topic": topic,
            "status": "review-now" if confidence < 0.5 else "ready",
            "next_review_days": next_review_days,
            "mastery": mastery,
        }
