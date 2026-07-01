"""Lightweight entity extraction for memories and profile updates."""

from __future__ import annotations

import re
from typing import Any, Dict, List


class EntityExtractor:
    """Extract structured entities such as technologies, companies, and goals."""

    def __init__(self) -> None:
        self._technologies = ["docker", "python", "react", "node", "sql", "fastapi", "nextjs", "typescript"]
        self._companies = ["microsoft", "google", "amazon", "meta", "apple", "netflix"]
        self._goals = ["internship", "job", "career", "goal", "promotion", "offer"]

    def extract(self, text: str) -> List[Dict[str, Any]]:
        if not text:
            return []

        lowered = text.lower()
        entities: List[Dict[str, Any]] = []
        for technology in self._technologies:
            if technology in lowered:
                entities.append({"type": "Technology", "value": technology.title(), "confidence": 0.9})
        for company in self._companies:
            if company in lowered:
                entities.append({"type": "Company", "value": company.title(), "confidence": 0.9})
        for goal in self._goals:
            if goal in lowered:
                entities.append({"type": "Goal", "value": goal.title(), "confidence": 0.8})

        if re.search(r"\b(\d{4})\b", text):
            entities.append({"type": "Date", "value": "year", "confidence": 0.7})
        return entities
