from typing import Any, Dict


class MasteryEngine:
    def update_mastery(self, existing: Dict[str, Any], updates: Dict[str, Any]) -> Dict[str, Any]:
        merged = dict(existing)
        for key, value in updates.items():
            if key in merged:
                merged[key] = max(merged[key], float(value))
            else:
                merged[key] = float(value)
        return merged
