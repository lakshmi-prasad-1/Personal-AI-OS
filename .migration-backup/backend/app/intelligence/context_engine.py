"""Assembles rich context from all brain modules for LLM reasoning."""

from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.intelligence.retrieval_pipeline import rank_retrieval_results
from app.intelligence.routing.llm_client import generate_embedding
from app.models.core_models import Idea, Note, Resource
from app.repositories import memory_repo, profile_repo
from app.repositories.search_repo import unified_semantic_search


async def assemble_brain_context(
    db: AsyncSession,
    user_id: UUID,
    query: str,
    limit: int = 5,
) -> Dict[str, Any]:
    """Build structured context sections consumed by chat and decision engine."""
    sections: List[Dict[str, str]] = []

    profile = await profile_repo.get_or_create_profile(db, user_id)
    profile_lines = []
    if profile.display_name:
        profile_lines.append(f"Name: {profile.display_name}")
    if profile.bio:
        profile_lines.append(f"Bio: {profile.bio}")
    if profile.institution or profile.current_semester:
        profile_lines.append(f"Education: {profile.institution or ''} {profile.current_semester or ''}".strip())
    if profile.current_work:
        profile_lines.append(f"Current work: {profile.current_work}")
    if profile.career_interests:
        profile_lines.append(f"Career interests: {', '.join(str(item) for item in profile.career_interests)}")
    if profile.skills:
        skills = [s.get("name", str(s)) if isinstance(s, dict) else str(s) for s in profile.skills]
        profile_lines.append(f"Skills: {', '.join(skills)}")
    if profile.goals:
        goals = [g.get("title", str(g)) if isinstance(g, dict) else str(g) for g in profile.goals]
        profile_lines.append(f"Goals: {', '.join(goals)}")
    if profile.current_projects:
        projects = [p.get("title", str(p)) if isinstance(p, dict) else str(p) for p in profile.current_projects]
        profile_lines.append(f"Active projects: {', '.join(projects)}")
    if profile.resume_summary:
        profile_lines.append(f"Resume summary: {profile.resume_summary[:500]}")

    if profile_lines:
        sections.append({"name": "user_profile", "content": "\n".join(profile_lines)})

    query_vector = await generate_embedding(query)
    if query_vector:
        memories = await memory_repo.search_similar_memories(db, user_id, query_vector, limit=limit)
        memories = rank_retrieval_results(memories, query)[:limit]
    else:
        memories = []

    if memories:
        mem_text = "\n".join(
            f"- [{m.get('category', 'Memory')}] {m.get('title')}: {m.get('description')} (relevance: {m.get('relevance_score', m.get('similarity', 0)):.2f})"
            for m in memories
        )
        sections.append({"name": "relevant_memories", "content": mem_text})

    search_results = await unified_semantic_search(db, user_id, query, limit=limit)
    grouped: Dict[str, List[str]] = {}
    for item in search_results.get("results", []):
        item_type = item.get("type", "Unknown")
        grouped.setdefault(item_type, []).append(f"- {item.get('title')} (score: {float(item.get('similarity', 0)):.2f})")

    for entity_type, lines in grouped.items():
        if entity_type == "Memory" and memories:
            continue
        sections.append({"name": f"relevant_{entity_type.lower()}s", "content": "\n".join(lines[:limit])})

    note_result = await db.execute(
        select(Note).where(Note.user_id == user_id, Note.is_pinned == True).limit(3)
    )
    pinned_notes = note_result.scalars().all()
    if pinned_notes:
        sections.append({
            "name": "pinned_notes",
            "content": "\n".join(f"- {n.title}: {n.content[:200]}" for n in pinned_notes),
        })

    resource_result = await db.execute(
        select(Resource)
        .where(Resource.user_id == user_id, Resource.is_processed == True)
        .order_by(Resource.updated_at.desc())
        .limit(3)
    )
    recent_resources = resource_result.scalars().all()
    if recent_resources:
        sections.append({
            "name": "recent_resources",
            "content": "\n".join(
                f"- {r.title}: {(r.ai_summary or r.description or '')[:200]}" for r in recent_resources
            ),
        })

    idea_result = await db.execute(
        select(Idea).where(Idea.user_id == user_id, Idea.status.in_(["raw", "exploring"])).limit(3)
    )
    active_ideas = idea_result.scalars().all()
    if active_ideas:
        sections.append({
            "name": "active_ideas",
            "content": "\n".join(f"- {i.title}: {i.content[:150]}" for i in active_ideas),
        })

    assembled = "\n\n".join(f"## {s['name'].replace('_', ' ').title()}\n{s['content']}" for s in sections)
    return {"query": query, "sections": sections, "assembled_prompt": assembled}


def context_to_system_messages(context: Dict[str, Any]) -> List[Dict[str, str]]:
    """Convert assembled brain context into LLM system messages."""
    messages = [{
        "role": "system",
        "content": (
            "You are the AI Brain OS — an executive assistant that understands the user's "
            "life, goals, projects, skills, and knowledge base. Use the provided context to "
            "give personalized, proactive, accurate answers. Reference specific memories, "
            "resources, and goals when relevant."
        ),
    }]
    if context.get("assembled_prompt"):
        messages.append({"role": "system", "content": context["assembled_prompt"]})
    return messages
