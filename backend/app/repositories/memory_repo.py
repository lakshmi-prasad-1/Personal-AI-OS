from typing import List, Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete, text, or_, and_
from app.models.core_models import Memory
from app.schemas.memory import MemoryCreate, MemoryUpdate, MemoryExtractedItem


async def create_memory(
    db: AsyncSession,
    user_id: UUID,
    memory_data: MemoryCreate | MemoryExtractedItem,
    embedding: Optional[List[float]] = None,
    source_message_id: Optional[UUID] = None,
) -> Memory:
    db_memory = Memory(
        user_id=user_id,
        title=memory_data.title,
        description=memory_data.description,
        category=memory_data.category if isinstance(memory_data.category, str) else memory_data.category.value,
        tags=memory_data.tags,
        importance_score=memory_data.importance_score,
        confidence_score=memory_data.confidence_score,
        embedding=embedding,
        source_message_id=source_message_id,
    )
    db.add(db_memory)
    await db.commit()
    await db.refresh(db_memory)
    return db_memory


async def get_memory(db: AsyncSession, memory_id: UUID, user_id: UUID) -> Optional[Memory]:
    result = await db.execute(
        select(Memory).where(and_(Memory.id == memory_id, Memory.user_id == user_id))
    )
    return result.scalars().first()


async def get_user_memories(
    db: AsyncSession,
    user_id: UUID,
    category: Optional[str] = None,
    tags: Optional[List[str]] = None,
    archived: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> List[Memory]:
    query = select(Memory).where(and_(Memory.user_id == user_id, Memory.is_archived == archived))

    if category:
        query = query.where(Memory.category == category)
    if tags:
        # JSONB contains-any operator
        query = query.where(Memory.tags.op("?|")(tags))

    query = query.order_by(Memory.importance_score.desc(), Memory.created_at.desc())
    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()


async def update_memory(
    db: AsyncSession, memory_id: UUID, user_id: UUID, updates: MemoryUpdate
) -> Optional[Memory]:
    update_data = updates.model_dump(exclude_unset=True)
    if not update_data:
        return await get_memory(db, memory_id, user_id)

    # Handle enum serialization
    if "category" in update_data and update_data["category"] is not None:
        update_data["category"] = update_data["category"].value if hasattr(update_data["category"], "value") else update_data["category"]

    await db.execute(
        update(Memory)
        .where(and_(Memory.id == memory_id, Memory.user_id == user_id))
        .values(**update_data)
    )
    await db.commit()
    return await get_memory(db, memory_id, user_id)


async def delete_memory(db: AsyncSession, memory_id: UUID, user_id: UUID) -> bool:
    result = await db.execute(
        delete(Memory).where(and_(Memory.id == memory_id, Memory.user_id == user_id))
    )
    await db.commit()
    return result.rowcount > 0


async def search_similar_memories(
    db: AsyncSession,
    user_id: UUID,
    query_embedding: List[float],
    limit: int = 5,
    min_importance: float = 0.0,
    category: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """pgvector cosine similarity search with optional filters."""
    filters = "AND m.user_id = :user_id AND m.is_archived = false AND m.importance_score >= :min_importance"
    params: Dict[str, Any] = {
        "embedding": str(query_embedding),
        "user_id": str(user_id),
        "limit": limit,
        "min_importance": min_importance,
    }
    if category:
        filters += " AND m.category = :category"
        params["category"] = category

    query = text(f"""
        SELECT m.id, m.title, m.description, m.category, m.tags,
               m.importance_score, m.confidence_score,
               1 - (m.embedding <=> :embedding::vector) AS similarity
        FROM memories m
        WHERE m.embedding IS NOT NULL {filters}
        ORDER BY m.embedding <=> :embedding::vector
        LIMIT :limit
    """)
    result = await db.execute(query, params)
    rows = result.mappings().all()
    return [dict(r) for r in rows]


async def full_text_search_memories(
    db: AsyncSession, user_id: UUID, query: str, limit: int = 10
) -> List[Memory]:
    """Full-text keyword search across title and description."""
    search_query = f"%{query.lower()}%"
    result = await db.execute(
        select(Memory)
        .where(
            and_(
                Memory.user_id == user_id,
                Memory.is_archived == False,
                or_(
                    Memory.title.ilike(search_query),
                    Memory.description.ilike(search_query),
                ),
            )
        )
        .order_by(Memory.importance_score.desc())
        .limit(limit)
    )
    return result.scalars().all()
