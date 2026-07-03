from __future__ import annotations

from typing import Any, Dict


class QuizEngine:
    def generate_quiz(self, topic: str, difficulty: str = "medium") -> Dict[str, Any]:
        return {
            "topic": topic,
            "difficulty": difficulty,
            "questions": [
                {
                    "type": "mcq",
                    "prompt": f"What is the main idea of {topic}?",
                    "options": ["A", "B", "C", "D"],
                    "answer": "A",
                }
            ],
        }
