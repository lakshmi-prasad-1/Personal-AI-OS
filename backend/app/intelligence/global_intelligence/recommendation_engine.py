from typing import Any, Dict


class RecommendationEngine:
    def recommend(self, category: str, context: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "category": category,
            "title": f"Recommended next step for {category}",
            "reason": f"The current context suggests a focused {category} action.",
            "context": context,
        }
