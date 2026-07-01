from typing import Annotated
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_active_user
from app.models.core_models import User
from app.schemas.graph import GraphNodeCreate, GraphNodeRead, GraphEdgeCreate, GraphEdgeRead, GraphData
from app.repositories import graph_repo

router = APIRouter()

@router.post("/nodes", response_model=GraphNodeRead)
async def add_node(
    node_in: GraphNodeCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Manually add a node to the Knowledge Graph.
    """
    return await graph_repo.create_node(db, current_user.id, node_in)

@router.post("/edges", response_model=GraphEdgeRead)
async def add_edge(
    edge_in: GraphEdgeCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Manually add an edge (relationship) between two nodes in the graph.
    """
    return await graph_repo.create_edge(db, edge_in)

@router.get("/", response_model=GraphData)
async def get_graph(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve the entire Knowledge Graph structure for visualization.
    """
    nodes, edges = await graph_repo.get_user_graph(db, current_user.id)
    return {"nodes": nodes, "edges": edges}
