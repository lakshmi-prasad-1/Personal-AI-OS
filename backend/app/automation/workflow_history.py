from typing import Any, Dict, List


class WorkflowHistory:
    def __init__(self) -> None:
        self.entries: List[Dict[str, Any]] = []

    def record(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        self.entries.append(entry)
        return entry
