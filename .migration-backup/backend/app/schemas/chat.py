from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1)


class MessageRead(BaseModel):
    id: UUID
    chat_id: UUID
    role: str
    content: str
    token_count: Optional[int] = None
    model_used: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)


class ChatUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    is_pinned: Optional[bool] = None


class ChatRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    is_pinned: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    messages: List[MessageRead] = []

    class Config:
        from_attributes = True


class ChatListItem(BaseModel):
    """Lightweight chat list item without messages for list endpoints."""
    id: UUID
    user_id: UUID
    title: str
    is_pinned: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatResponseRequest(BaseModel):
    message: str = Field(..., min_length=1)


class ChatSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    limit: int = Field(default=10, ge=1, le=50)
