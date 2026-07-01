from __future__ import annotations

from typing import Any, Dict


class TutorEngine:
    def answer_question(self, question: str, level: str = "beginner") -> Dict[str, Any]:
        return {
            "answer": f"A linked list is a linear data structure where each node points to the next node. Example: 1 -> 2 -> 3.",
            "level": level,
            "example": "Use it when you need efficient insertions and deletions.",
            "follow_up": "Would you like a visual diagram or a coding example?",
        }
