"""Profile updates driven by extracted memories and user statements."""

from __future__ import annotations

from typing import Any, Dict, List

from app.intelligence.entity_extractor import EntityExtractor


class ProfileEngine:
    """Synchronize structured profile fields from memory items."""

    def __init__(self) -> None:
        self._entity_extractor = EntityExtractor()

    def update_profile_from_memory(self, profile: Dict[str, Any], memory: Dict[str, Any]) -> Dict[str, Any]:
        if not profile:
            profile = {"skills": [], "goals": [], "career_interests": []}

        title = str(memory.get("title", "")).strip()
        description = str(memory.get("description", "")).strip()
        category = str(memory.get("category", "")).strip()
        combined = f"{title} {description}".strip()
        entities = self._entity_extractor.extract(combined)

        if category.lower() in {"skills", "skill"}:
            for entity in entities:
                if entity["type"] == "Technology":
                    self._add_unique(profile.setdefault("skills", []), {"name": entity["value"], "level": "learning"})
        if category.lower() in {"goals", "goal"}:
            self._add_unique(profile.setdefault("goals", []), {"title": title or "Goal", "status": "active"})
        if category.lower() in {"career", "company", "goal"} or any(entity["type"] == "Goal" for entity in entities):
            self._add_career_interest(profile, combined)

        if title.lower().startswith("learn") or title.lower().startswith("learning"):
            for entity in entities:
                if entity["type"] == "Technology":
                    self._add_unique(profile.setdefault("skills", []), {"name": entity["value"], "level": "learning"})

        return profile

    def _add_unique(self, field: List[Any], item: Any) -> None:
        if isinstance(item, str):
            key = item
            if not any(existing == key for existing in field if isinstance(existing, str)):
                field.append(item)
            return

        key = item.get("name") or item.get("title")
        if not key:
            return
        if not any(
            (existing.get("name") if isinstance(existing, dict) else existing) == key
            for existing in field
        ):
            field.append(item)

    def _add_career_interest(self, profile: Dict[str, Any], text: str) -> None:
        lowered = text.lower()
        interests = profile.setdefault("career_interests", [])
        if "internship" in lowered or "software internship" in lowered:
            self._add_unique(interests, "software internship")
        elif "job" in lowered:
            self._add_unique(interests, "job search")
        elif "career" in lowered:
            self._add_unique(interests, "career growth")
