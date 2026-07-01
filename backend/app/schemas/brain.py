from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class BrainContextRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(default=5, ge=1, le=20)


class BrainContextSection(BaseModel):
    name: str
    content: str


class BrainContextResponse(BaseModel):
    query: str
    sections: List[BrainContextSection]
    assembled_prompt: str


class DecisionAction(BaseModel):
    rule: str
    action: str
    reason: str
    priority: str = "medium"
    payload: Dict[str, Any] = {}


class BrainDecisionRequest(BaseModel):
    query: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class BrainDecisionResponse(BaseModel):
    decisions: List[DecisionAction]


class UniversalSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(default=10, ge=1, le=50)
    types: Optional[List[str]] = None


class UniversalSearchResult(BaseModel):
    id: str
    title: str
    type: str
    similarity: float
    relevance_score: Optional[float] = None
    snippet: Optional[str] = None


class UniversalSearchResponse(BaseModel):
    query: str
    results: List[UniversalSearchResult]
