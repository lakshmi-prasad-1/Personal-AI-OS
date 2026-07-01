from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.intelligence.routing.llm_client import generate_embedding
from app.intelligence.semantic_search import placeholder_similarity_service
from app.models.core_models import Idea, Memory, Note, Resource
from app.repositories import profile_repo


async def unified_semantic_search(db: AsyncSession, user_id: UUID, query: str, limit: int = 5) -> Dict[str, List[Dict[str, Any]]]:
    """Perform a cross-domain semantic search using pgvector when available and a deterministic placeholder fallback otherwise."""
    try:
        profile = await profile_repo.get_or_create_profile(db, user_id)
        query_embedding = await generate_embedding(query)
        if not query_embedding:
            raise ValueError("Embeddings unavailable")
        embedding_str = str(query_embedding)

        memory_query = text("""
            SELECT id, title, 'Memory' as type, 1 - (embedding <=> :emb) AS similarity
            FROM memories WHERE user_id = :uid ORDER BY embedding <=> :emb LIMIT :l
        """)
        note_query = text("""
            SELECT id, title, 'Note' as type, 1 - (embedding <=> :emb) AS similarity
            FROM notes WHERE user_id = :uid ORDER BY embedding <=> :emb LIMIT :l
        """)
        resource_query = text("""
            SELECT id, title, 'Resource' as type, 1 - (embedding <=> :emb) AS similarity
            FROM resources WHERE user_id = :uid ORDER BY embedding <=> :emb LIMIT :l
        """)
        idea_query = text("""
            SELECT id, title, 'Idea' as type, 1 - (embedding <=> :emb) AS similarity
            FROM ideas WHERE user_id = :uid ORDER BY embedding <=> :emb LIMIT :l
        """)

        params = {"emb": embedding_str, "uid": user_id, "l": limit}

        mem_res = await db.execute(memory_query, params)
        not_res = await db.execute(note_query, params)
        res_res = await db.execute(resource_query, params)
        ida_res = await db.execute(idea_query, params)

        all_results = []
        all_results.extend(mem_res.mappings().all())
        all_results.extend(not_res.mappings().all())
        all_results.extend(res_res.mappings().all())
        all_results.extend(ida_res.mappings().all())

        all_results.sort(key=lambda x: x["similarity"], reverse=True)
        grouped: Dict[str, List[Dict[str, Any]]] = {"Memory": [], "Note": [], "Resource": [], "Idea": []}
        for item in all_results[:limit]:
            grouped.setdefault(item.get("type", "Memory"), []).append(item)
        return {"results": all_results[:limit], "grouped": grouped, "profile": {"name": profile.display_name, "goals": profile.goals or []}}
    except Exception:
        memories = (await db.execute(select(Memory.id, Memory.title).where(Memory.user_id == user_id).limit(limit))).all()
        notes = (await db.execute(select(Note.id, Note.title).where(Note.user_id == user_id).limit(limit))).all()
        resources = (await db.execute(select(Resource.id, Resource.title).where(Resource.user_id == user_id).limit(limit))).all()
        ideas = (await db.execute(select(Idea.id, Idea.title).where(Idea.user_id == user_id).limit(limit))).all()

        candidates = [item[1] for item in [*memories, *notes, *resources, *ideas]]
        scored = placeholder_similarity_service(query, candidates)
        results = []
        for index, entry in enumerate(scored):
            item_type = "Memory" if index < len(memories) else "Note" if index < len(memories) + len(notes) else "Resource" if index < len(memories) + len(notes) + len(resources) else "Idea"
            payload = {
                "id": [*memories, *notes, *resources, *ideas][index][0],
                "title": entry["text"],
                "type": item_type,
                "similarity": entry["score"],
            }
            results.append(payload)

        return {"results": results[:limit], "grouped": {"Memory": results[: max(1, limit // 2)], "Note": [], "Resource": [], "Idea": []}, "profile": {"name": profile.display_name, "goals": profile.goals or []}}
