from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.core_models import GraphEdge, GraphNode
from app.schemas.graph import GraphEdgeCreate, GraphNodeCreate


async def create_node(db: AsyncSession, user_id: UUID, node_in: GraphNodeCreate) -> GraphNode:
    db_node = GraphNode(
        user_id=user_id,
        entity_type=node_in.entity_type,
        entity_id=node_in.entity_id,
        label=node_in.label,
    )
    db.add(db_node)
    await db.commit()
    await db.refresh(db_node)
    return db_node


async def get_or_create_node(
    db: AsyncSession,
    user_id: UUID,
    entity_type: str,
    entity_id: UUID,
    label: str,
    metadata: Optional[dict] = None,
) -> GraphNode:
    result = await db.execute(
        select(GraphNode).where(
            and_(
                GraphNode.user_id == user_id,
                GraphNode.entity_type == entity_type,
                GraphNode.entity_id == entity_id,
            )
        )
    )
    node = result.scalars().first()
    if node:
        if metadata:
            node.node_metadata = {**(node.node_metadata or {}), **metadata}
            await db.commit()
            await db.refresh(node)
        return node

    db_node = GraphNode(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        label=label,
        node_metadata=metadata or {},
    )
    db.add(db_node)
    await db.commit()
    await db.refresh(db_node)
    return db_node


async def find_nodes_by_labels(db: AsyncSession, user_id: UUID, labels: List[str]) -> List[GraphNode]:
    if not labels:
        return []
    normalized = {label.lower().strip() for label in labels if label}
    result = await db.execute(select(GraphNode).where(GraphNode.user_id == user_id))
    nodes = result.scalars().all()
    return [n for n in nodes if n.label.lower().strip() in normalized]


async def get_or_create_edge(
    db: AsyncSession,
    source_node_id: UUID,
    target_node_id: UUID,
    relationship_type: str,
    weight: float = 1.0,
) -> GraphEdge:
    result = await db.execute(
        select(GraphEdge).where(
            and_(
                GraphEdge.source_node_id == source_node_id,
                GraphEdge.target_node_id == target_node_id,
                GraphEdge.relationship_type == relationship_type,
            )
        )
    )
    edge = result.scalars().first()
    if edge:
        return edge

    db_edge = GraphEdge(
        source_node_id=source_node_id,
        target_node_id=target_node_id,
        relationship_type=relationship_type,
        weight=weight,
    )
    db.add(db_edge)
    await db.commit()
    await db.refresh(db_edge)
    return db_edge


async def create_edge(db: AsyncSession, edge_in: GraphEdgeCreate) -> GraphEdge:
    return await get_or_create_edge(
        db,
        edge_in.source_node_id,
        edge_in.target_node_id,
        edge_in.relationship_type,
        edge_in.weight,
    )


async def get_user_graph(db: AsyncSession, user_id: UUID) -> Tuple[List[GraphNode], List[GraphEdge]]:
    nodes_result = await db.execute(select(GraphNode).where(GraphNode.user_id == user_id))
    nodes = nodes_result.scalars().all()

    if not nodes:
        return [], []

    node_ids = [n.id for n in nodes]
    edges_result = await db.execute(
        select(GraphEdge).where(
            (GraphEdge.source_node_id.in_(node_ids)) | (GraphEdge.target_node_id.in_(node_ids))
        )
    )
    edges = edges_result.scalars().all()
    return nodes, edges
