from datetime import datetime, timezone
from typing import Any, Dict, List


class AuditLogger:
    def __init__(self) -> None:
        self.entries: List[Dict[str, Any]] = []

    def log(self, action: str, details: Dict[str, Any] | None = None) -> Dict[str, Any]:
        entry = {"action": action, "details": details or {}, "timestamp": datetime.now(timezone.utc).isoformat()}
        self.entries.append(entry)
        return entry
