from __future__ import annotations

from typing import Any, Dict, List


class FlashcardEngine:
    def generate_flashcards(self, topics: List[str], difficulty: str = "medium") -> List[Dict[str, Any]]:
        return [
            {
                "front": topic,
                "back": f"Explain {topic} clearly.",
                "difficulty": difficulty,
            }
            for topic in topics
        ]
