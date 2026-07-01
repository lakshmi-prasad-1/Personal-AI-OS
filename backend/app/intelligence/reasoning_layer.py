"""Reasoning pipeline for AI Brain V2 chat and decision flows."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.intelligence.context_engine import assemble_brain_context, context_to_system_messages
from app.intelligence.brain.decision_service import evaluate_decisions
from app.intelligence.entity_extractor import EntityExtractor
from app.intelligence.memory_classifier import MemoryClassifier
from app.intelligence.profile_engine import ProfileEngine


class ReasoningLayer:
    """Coordinates intent detection, context assembly, decision generation, and response prep."""

    def __init__(self) -> None:
        self._entity_extractor = EntityExtractor()
        self._memory_classifier = MemoryClassifier()
        self._profile_engine = ProfileEngine()

    async def reason(self, db: AsyncSession, user_id: UUID, query: str, limit: int = 5) -> Dict[str, Any]:
        context = await assemble_brain_context(db, user_id, query, limit=limit)
        entities = self._entity_extractor.extract(query)
        classification = self._memory_classifier.classify(query)
        decisions = await evaluate_decisions(db, user_id, query, extra_context={
            "entities": entities,
            "memory_classification": classification,
        })

        return {
            "query": query,
            "entities": entities,
            "classification": classification,
            "context": context,
            "messages": context_to_system_messages(context),
            "decisions": decisions,
            "intent": self._infer_intent(query, entities, classification),
        }

    def _infer_intent(self, query: str, entities: List[Dict[str, Any]], classification: Dict[str, Any]) -> str:
        lowered = query.lower()
        if any(entity["type"] == "Goal" for entity in entities):
            return "career_goal"
        if any(entity["type"] == "Company" for entity in entities):
            return "company_target"
        if any(entity["type"] == "Technology" for entity in entities):
            return "learning_path"
        if classification.get("category") in {"Goal", "Skill"}:
            return "planning"
        return "general"
