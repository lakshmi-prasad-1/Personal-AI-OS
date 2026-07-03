"""Automatic knowledge graph construction from brain entities."""

import uuid
from typing import Iterable, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories import graph_repo


ENTITY_RELATIONSHIPS = {
    ("Memory", "Skill"): "LEARNS",
    ("Resource", "Skill"): "TEACHES",
    ("Note", "Project"): "DOCUMENTS",
    ("Idea", "Project"): "INSPIRES",
    ("Memory", "Project"): "SUPPORTS",
    ("Resource", "Project"): "USED_IN",
    ("Memory", "Memory"): "RELATED_TO",
    ("Memory", "Company"): "APPLIED_TO",
    ("Memory", "Goal"): "SUPPORTS",
    ("Memory", "Technology"): "LEARNS",
}


def _skill_entity_id(user_id: UUID, label: str) -> UUID:
    return uuid.uuid5(uuid.NAMESPACE_DNS, f"{user_id}:skill:{label.lower().strip()}")


async def sync_entity_to_graph(
    db: AsyncSession,
    user_id: UUID,
    entity_type: str,
    entity_id: UUID,
    label: str,
    tags: Optional[List[str]] = None,
    related_labels: Optional[List[str]] = None,
) -> None:
    """Ensure an entity exists as a graph node and link it to tag/skill nodes."""
    tags = tags or []
    node = await graph_repo.get_or_create_node(
        db,
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        label=label,
        metadata={"tags": tags},
    )

    link_targets = set(tags)
    if related_labels:
        link_targets.update(related_labels)

    for tag in link_targets:
        tag_label = tag.strip()
        if not tag_label or tag_label.lower() == label.lower():
            continue

        skill_node = await graph_repo.get_or_create_node(
            db,
            user_id=user_id,
            entity_type="Skill",
            entity_id=_skill_entity_id(user_id, tag_label),
            label=tag_label,
            metadata={"canonical": True},
        )
        rel = ENTITY_RELATIONSHIPS.get((entity_type, "Skill"), "RELATED_TO")
        await graph_repo.get_or_create_edge(db, node.id, skill_node.id, rel)

    existing = await graph_repo.find_nodes_by_labels(db, user_id, list(link_targets))
    for other in existing:
        if other.id == node.id:
            continue
        rel = ENTITY_RELATIONSHIPS.get((entity_type, other.entity_type), "RELATED_TO")
        await graph_repo.get_or_create_edge(db, node.id, other.id, rel, weight=0.8)


async def connect_resource_to_memories(
    db: AsyncSession,
    user_id: UUID,
    resource_id: UUID,
    resource_title: str,
    memory_tags: Iterable[str],
) -> None:
    """Link a processed resource to skill nodes shared with memories."""
    await sync_entity_to_graph(
        db,
        user_id=user_id,
        entity_type="Resource",
        entity_id=resource_id,
        label=resource_title,
        tags=list(memory_tags),
    )
