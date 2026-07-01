from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class Event:
    type: str
    payload: Dict[str, Any]
    source: Optional[str] = None
    timestamp: Optional[str] = None


@dataclass
class Subscription:
    topic: str
    handler: Any
