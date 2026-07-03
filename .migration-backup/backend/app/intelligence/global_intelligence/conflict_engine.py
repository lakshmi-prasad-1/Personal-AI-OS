from typing import Any, Dict, List


class ConflictEngine:
    def detect_conflicts(self, priorities: Dict[str, Any]) -> List[Dict[str, Any]]:
        conflicts = []
        values = {k: int(v) for k, v in priorities.items() if isinstance(v, (int, float))}
        if len(values) >= 3:
            conflicts.append({
                "type": "priority_overlap",
                "message": "Several high-priority activities compete for the same attention window.",
            })
        return conflicts
