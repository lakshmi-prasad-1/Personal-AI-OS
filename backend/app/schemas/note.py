from typing import Optional, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


class NoteFolderCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    parent_folder_id: Optional[UUID] = None


class NoteFolderRead(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    parent_folder_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    folder_id: Optional[UUID] = None
    tags: List[str] = []
    is_markdown: bool = True


class NoteUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = None
    folder_id: Optional[UUID] = None
    tags: Optional[List[str]] = None
    is_markdown: Optional[bool] = None
    is_pinned: Optional[bool] = None


class NoteRead(BaseModel):
    id: UUID
    user_id: UUID
    folder_id: Optional[UUID] = None
    title: str
    content: str
    tags: List[str] = []
    is_markdown: bool
    is_pinned: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
