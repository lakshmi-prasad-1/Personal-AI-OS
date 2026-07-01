from typing import Any, Dict, List, Optional


def build_voice_command(command_text: str, module: str = "chat") -> Dict[str, Any]:
    """Create a normalized voice-command payload routed through the AI Brain."""
    cleaned = command_text.strip()
    lowered = cleaned.lower()

    if lowered.startswith(("open ", "show ", "list ")):
        action = "open"
        normalized_query = cleaned.split(" ", 1)[1].strip() if " " in cleaned else cleaned
    elif lowered.startswith(("remember ", "save ", "note ")):
        action = "ingest"
        normalized_query = cleaned.split(" ", 1)[1].strip() if " " in cleaned else cleaned
    elif lowered.startswith(("search ", "find ", "look up ")):
        action = "search"
        normalized_query = cleaned.split(" ", 1)[1].strip() if " " in cleaned else cleaned
    else:
        action = "chat"
        normalized_query = cleaned

    payload: Dict[str, Any] = {"query": normalized_query, "text": cleaned}

    route_map = {
        "chat": "/brain/ingest" if action == "ingest" else "/chat",
        "memory": "/brain/ingest",
        "notes": "/notes",
        "resources": "/resources",
        "ideas": "/ideas",
        "search": "/brain/search",
    }

    return {
        "module": module,
        "action": action,
        "payload": payload,
        "brain_route": route_map.get(module if action != "search" else "search", "/brain/ingest"),
        "voice_ready": True,
    }


def voice_to_brain_request(command: Dict[str, Any]) -> Dict[str, Any]:
    """Map a voice command to a brain API request body."""
    action = command.get("action", "chat")
    payload = command.get("payload", {})

    if action == "ingest":
        return {"method": "POST", "path": "/brain/ingest", "body": {"text": payload.get("text", "")}}
    if action == "search":
        return {"method": "POST", "path": "/brain/search", "body": {"query": payload.get("query", ""), "limit": 10}}
    return {"method": "POST", "path": "/brain/context", "body": {"query": payload.get("query", ""), "limit": 5}}
