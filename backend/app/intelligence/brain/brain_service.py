"""Central AI Brain service — single entry point for all future OS modules."""

from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.intelligence.context_engine import assemble_brain_context, context_to_system_messages
from app.intelligence.brain.decision_service import evaluate_decisions
from app.intelligence.graph.graph_builder import sync_entity_to_graph
from app.intelligence.memory.memory_service import process_text_for_memories
from app.intelligence.retrieval_pipeline import rank_retrieval_results
from app.repositories.search_repo import unified_semantic_search


class BrainService:
    """Facade consumed by chat, voice, and future Productivity/Career modules."""

    async def get_context(self, db: AsyncSession, user_id: UUID, query: str, limit: int = 5) -> Dict[str, Any]:
        return await assemble_brain_context(db, user_id, query, limit)

    def context_messages(self, context: Dict[str, Any]) -> List[Dict[str, str]]:
        return context_to_system_messages(context)

    async def universal_search(
        self,
        db: AsyncSession,
        user_id: UUID,
        query: str,
        limit: int = 10,
        types: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        results = await unified_semantic_search(db, user_id, query, limit=limit * 2)
        ranked = rank_retrieval_results(
            [
                {
                    **item,
                    "importance_score": float(item.get("similarity", 0)),
                    "created_at": None,
                }
                for item in results.get("results", [])
            ],
            query,
        )
        if types:
            type_set = {t.lower() for t in types}
            ranked = [r for r in ranked if r.get("type", "").lower() in type_set]
        return {"query": query, "results": ranked[:limit]}

    async def decide(
        self,
        db: AsyncSession,
        user_id: UUID,
        query: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        return await evaluate_decisions(db, user_id, query, context)

    async def ingest_text(
        self,
        db: AsyncSession,
        user_id: UUID,
        text: str,
        source_message_id: Optional[UUID] = None,
    ) -> List[UUID]:
        return await process_text_for_memories(db, user_id, text, source_message_id)

    async def on_entity_created(
        self,
        db: AsyncSession,
        user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        label: str,
        tags: Optional[List[str]] = None,
    ) -> None:
        await sync_entity_to_graph(db, user_id, entity_type, entity_id, label, tags=tags)


brain_service = BrainService()
