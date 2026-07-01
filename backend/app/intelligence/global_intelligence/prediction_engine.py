from typing import Any, Dict


class PredictionEngine:
    def predict(self, context: Dict[str, Any]) -> Dict[str, Any]:
        completion = float(context.get("current_completion", 0.0))
        pace = float(context.get("pace_per_day", 0.05))
        remaining = max(1.0 - completion, 0.0)
        estimated_days = max(int(remaining / pace) if pace > 0 else 1, 1)
        return {
            "estimated_completion_days": estimated_days,
            "remaining_fraction": remaining,
            "confidence": "medium",
        }
