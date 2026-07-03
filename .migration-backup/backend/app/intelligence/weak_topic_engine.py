from __future__ import annotations

from typing import Any, Dict, List


class WeakTopicEngine:
    def detect(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [item for item in sorted(results, key=lambda x: x.get("score", 1.0)) if item.get("score", 1.0) < 0.5]
