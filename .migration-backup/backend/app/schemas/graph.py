from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel

class GraphNodeBase(BaseModel):
    entity_type: str
    entity_id: UUID
    label: str

class GraphNodeCreate(GraphNodeBase):
    pass

class GraphNodeRead(GraphNodeBase):
    id: UUID
    user_id: UUID

    class Config:
        from_attributes = True

class GraphEdgeBase(BaseModel):
    source_node_id: UUID
    target_node_id: UUID
    relationship_type: str
    weight: float = 1.0

class GraphEdgeCreate(GraphEdgeBase):
    pass

class GraphEdgeRead(GraphEdgeBase):
    id: UUID

    class Config:
        from_attributes = True

class GraphData(BaseModel):
    nodes: List[GraphNodeRead]
    edges: List[GraphEdgeRead]
