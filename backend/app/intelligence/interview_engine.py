from __future__ import annotations

from typing import Any, Dict


class InterviewEngine:
    def generate_feedback(self, question: str, response: str) -> Dict[str, Any]:
        return {
            "category": "behavioral",
            "question": question,
            "feedback": "Structure your answer with context, action, and result.",
            "strengths": ["Clear intent"],
            "improvements": ["Add a measurable outcome"],
        }
