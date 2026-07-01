"""Memory V2: active extraction, reconciliation, and profile sync."""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.intelligence.entity_extractor import EntityExtractor
from app.intelligence.extraction.memory_engine import extract_memories_from_text, process_and_vectorize_memory
from app.intelligence.graph.graph_builder import sync_entity_to_graph
from app.intelligence.memory_classifier import MemoryClassifier
from app.intelligence.memory_linker import MemoryLinker
from app.intelligence.profile_engine import ProfileEngine
from app.intelligence.timeline_engine import TimelineEngine
from app.repositories import memory_repo, profile_repo
from app.schemas.memory import MemoryExtractedItem, MemoryUpdate

_classifier = MemoryClassifier()
_entity_extractor = EntityExtractor()
_profile_engine = ProfileEngine()
_timeline_engine = TimelineEngine()
_linker = MemoryLinker()


async def _find_similar_memory(db: AsyncSession, user_id: UUID, item: MemoryExtractedItem):
    vector = await process_and_vectorize_memory(item)
    if not vector:
        return None
    results = await memory_repo.search_similar_memories(db, user_id, vector, limit=1, min_importance=0.0)
    if results and results[0].get("similarity", 0) > 0.85:
        return results[0]
    return None


async def reconcile_memory_item(
    db: AsyncSession,
    user_id: UUID,
    item: MemoryExtractedItem,
    source_message_id: Optional[UUID] = None,
) -> Optional[UUID]:
    """Create, update, merge, or ignore an extracted memory item."""
    if item.action == "Ignore":
        return None

    vector = await process_and_vectorize_memory(item)

    classification = _classifier.classify({
        "title": item.title,
        "description": item.description,
        "category": item.category,
    })
    item.tags = list(dict.fromkeys((item.tags or []) + classification.get("tags", [])))
    item.importance_score = max(float(item.importance_score), float(classification.get("importance", 0.0)))
    item.confidence_score = max(float(item.confidence_score), float(classification.get("confidence", 0.0)))

    if item.action in ("Update", "Merge"):
        existing = await _find_similar_memory(db, user_id, item)
        if existing:
            await memory_repo.update_memory(
                db,
                UUID(existing["id"]),
                user_id,
                MemoryUpdate(
                    title=item.title,
                    description=item.description,
                    tags=item.tags,
                    importance_score=item.importance_score,
                    confidence_score=item.confidence_score,
                ),
            )
            memory_id = UUID(existing["id"])
        else:
            memory = await memory_repo.create_memory(
                db, user_id, item, embedding=vector, source_message_id=source_message_id
            )
            memory_id = memory.id
    else:
        memory = await memory_repo.create_memory(
            db, user_id, item, embedding=vector, source_message_id=source_message_id
        )
        memory_id = memory.id

    await sync_entity_to_graph(
        db,
        user_id=user_id,
        entity_type="Memory",
        entity_id=memory_id,
        label=item.title,
        tags=item.tags,
    )
    await _sync_profile_from_memory(db, user_id, item)
    await _sync_timeline_and_links(db, user_id, item, memory_id)
    return memory_id


async def _sync_profile_from_memory(db: AsyncSession, user_id: UUID, item: MemoryExtractedItem) -> None:
    """Promote structured profile fields from high-confidence memories."""
    if item.confidence_score < 0.7:
        return

    profile = await profile_repo.get_or_create_profile(db, user_id)
    category = item.category if isinstance(item.category, str) else str(item.category)
    profile_data = {
        "skills": list(profile.skills or []),
        "goals": list(profile.goals or []),
        "career_interests": list(profile.career_interests or []),
    }

    _profile_engine.update_profile_from_memory(profile_data, {
        "title": item.title,
        "description": item.description,
        "category": category,
        "confidence_score": item.confidence_score,
    })

    profile.skills = profile_data.get("skills", [])
    profile.goals = profile_data.get("goals", [])
    profile.career_interests = profile_data.get("career_interests", [])
    await db.commit()


async def _sync_timeline_and_links(db: AsyncSession, user_id: UUID, item: MemoryExtractedItem, memory_id: UUID) -> None:
    """Track the memory in a lightweight timeline and create relationship suggestions."""
    memories = await memory_repo.get_user_memories(db, user_id, limit=20)
    timeline_items = [
        {"id": str(m.id), "title": m.title, "created_at": m.created_at.isoformat() if m.created_at else None}
        for m in memories
    ]
    timeline_items.append({"id": str(memory_id), "title": item.title, "created_at": None})
    _timeline_engine.build_timeline(timeline_items)

    relationships = _linker.link([
        {"id": str(memory_id), "title": item.title, "tags": item.tags or []},
        *[{"id": str(m.id), "title": m.title, "tags": m.tags or []} for m in memories[:5]],
    ])
    for relationship in relationships:
        if relationship["source"] == str(memory_id):
            await sync_entity_to_graph(
                db,
                user_id=user_id,
                entity_type="Memory",
                entity_id=memory_id,
                label=item.title,
                tags=item.tags,
                related_labels=[relationship["target"]],
            )
            break


async def process_text_for_memories(
    db: AsyncSession,
    user_id: UUID,
    text: str,
    source_message_id: Optional[UUID] = None,
) -> List[UUID]:
    """Extract and reconcile memories from arbitrary text (chat, voice, notes)."""
    extracted = await extract_memories_from_text(text)
    stored_ids: List[UUID] = []
    for item in extracted:
        memory_id = await reconcile_memory_item(db, user_id, item, source_message_id)
        if memory_id:
            stored_ids.append(memory_id)
    return stored_ids


async def process_after_chat_message(
    db: AsyncSession,
    user_id: UUID,
    user_message: str,
    assistant_response: str,
    source_message_id: Optional[UUID] = None,
) -> List[UUID]:
    """Analyze a chat turn and update long-term memory proactively."""
    combined = f"User: {user_message}\nAssistant: {assistant_response}"
    return await process_text_for_memories(db, user_id, combined, source_message_id)
