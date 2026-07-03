from typing import List, Optional
from uuid import UUID

from sqlalchemy import delete, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.intelligence.routing.llm_client import generate_embedding
from app.intelligence.semantic_search import placeholder_similarity_service
from app.models.core_models import Note
from app.schemas.note import NoteCreate, NoteUpdate


async def create_note(db: AsyncSession, user_id: UUID, note_in: NoteCreate) -> Note:
    try:
        embedding = await generate_embedding(f"{note_in.title}: {note_in.content}")
    except Exception:
        embedding = None

    db_note = Note(
        user_id=user_id,
        title=note_in.title,
        content=note_in.content,
        folder_id=note_in.folder_id,
        tags=note_in.tags or [],
        is_markdown=note_in.is_markdown,
        embedding=embedding,
    )
    db.add(db_note)
    await db.commit()
    await db.refresh(db_note)
    return db_note


async def get_note(db: AsyncSession, note_id: UUID, user_id: UUID) -> Optional[Note]:
    result = await db.execute(select(Note).where(Note.id == note_id, Note.user_id == user_id))
    return result.scalars().first()


async def update_note(db: AsyncSession, note_id: UUID, user_id: UUID, updates: NoteUpdate) -> Optional[Note]:
    update_data = updates.model_dump(exclude_unset=True)
    if not update_data:
        return await get_note(db, note_id, user_id)

    await db.execute(update(Note).where(Note.id == note_id, Note.user_id == user_id).values(**update_data))
    await db.commit()
    return await get_note(db, note_id, user_id)


async def delete_note(db: AsyncSession, note_id: UUID, user_id: UUID) -> bool:
    result = await db.execute(delete(Note).where(Note.id == note_id, Note.user_id == user_id))
    await db.commit()
    return result.rowcount > 0


async def get_user_notes(db: AsyncSession, user_id: UUID) -> List[Note]:
    result = await db.execute(select(Note).where(Note.user_id == user_id).order_by(Note.updated_at.desc()))
    return result.scalars().all()


async def search_similar_notes(db: AsyncSession, user_id: UUID, query: str, limit: int = 5) -> List[dict]:
    try:
        query_embedding = await generate_embedding(query)
        query_str = text("""
            SELECT id, title, content, created_at, updated_at,
                   1 - (embedding <=> :embedding) AS similarity
            FROM notes
            WHERE user_id = :user_id
            ORDER BY embedding <=> :embedding
            LIMIT :limit
        """)
        result = await db.execute(query_str, {
            "embedding": str(query_embedding),
            "user_id": user_id,
            "limit": limit,
        })
        return result.mappings().all()
    except Exception:
        notes = await get_user_notes(db, user_id)
        candidates = [f"{note.title}: {note.content}" for note in notes[:limit]]
        scored = placeholder_similarity_service(query, candidates)
        return [
            {
                "id": note.id,
                "title": note.title,
                "content": note.content,
                "similarity": item["score"],
                "created_at": note.created_at,
                "updated_at": note.updated_at,
            }
            for note, item in zip(notes[:limit], scored)
        ]
