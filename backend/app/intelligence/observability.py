import json
import logging
from typing import Any, Dict

logger = logging.getLogger("ai_brain.intelligence")


def log_event(event_name: str, **payload: Any) -> None:
    """Emit a structured, JSON-friendly intelligence event for observability."""
    logger.info("ai_event=%s %s", event_name, json.dumps(payload, default=str, ensure_ascii=False))
