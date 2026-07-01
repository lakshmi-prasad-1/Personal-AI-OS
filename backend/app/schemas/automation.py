from enum import Enum
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Event Schemas
# ---------------------------------------------------------------------------
class EventCreate(BaseModel):
    event_type: str = Field(..., min_length=1)
    payload: Dict[str, Any] = {}
    source: str = "api"


class EventRead(BaseModel):
    id: UUID
    user_id: Optional[UUID] = None
    event_type: str
    payload: Dict[str, Any] = {}
    source: Optional[str] = None
    is_processed: bool
    processed_at: Optional[datetime] = None
    error: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Workflow Schemas
# ---------------------------------------------------------------------------
class WorkflowCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    trigger_type: str = Field(..., pattern="^(event|schedule|webhook|manual)$")
    trigger_config: Dict[str, Any] = {}
    steps: List[Dict[str, Any]] = []


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger_config: Optional[Dict[str, Any]] = None
    steps: Optional[List[Dict[str, Any]]] = None
    is_active: Optional[bool] = None


class WorkflowRead(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    trigger_type: str
    trigger_config: Dict[str, Any] = {}
    steps: List[Dict[str, Any]] = []
    is_active: bool
    run_count: int
    last_run_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkflowRunRead(BaseModel):
    id: UUID
    workflow_id: UUID
    status: str
    steps_completed: int
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Notification Schemas
# ---------------------------------------------------------------------------
class NotificationChannel(str, Enum):
    EMAIL = "email"
    TELEGRAM = "telegram"
    DISCORD = "discord"
    PUSH = "push"
    IN_APP = "in_app"


class NotificationCreate(BaseModel):
    channel: NotificationChannel
    title: str = Field(..., min_length=1, max_length=300)
    body: str = Field(..., min_length=1)
    metadata: Dict[str, Any] = {}


class NotificationRead(BaseModel):
    id: UUID
    user_id: UUID
    channel: str
    title: str
    body: str
    status: str
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    metadata: Dict[str, Any] = {}
    error: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Webhook Schemas
# ---------------------------------------------------------------------------
class WebhookCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    path: str = Field(..., min_length=1, max_length=200, pattern=r"^[a-z0-9-_]+$")
    trigger_workflow_id: Optional[UUID] = None


class WebhookRead(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    path: str
    is_active: bool
    trigger_workflow_id: Optional[UUID] = None
    received_count: int
    last_received_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Backup Schemas
# ---------------------------------------------------------------------------
class BackupCreate(BaseModel):
    backup_type: str = Field(default="full", pattern="^(full|incremental|memories|notes)$")
    storage_provider: str = Field(default="local", pattern="^(local|gdrive|dropbox|onedrive)$")


class BackupRead(BaseModel):
    id: UUID
    user_id: UUID
    backup_type: str
    file_path: str
    size_bytes: Optional[int] = None
    checksum: Optional[str] = None
    status: str
    storage_provider: Optional[str] = None
    version: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Report Schemas
# ---------------------------------------------------------------------------
class WeeklyReportResponse(BaseModel):
    week_start: str
    week_end: str
    tasks_completed: int
    habits_completed: int
    focus_hours: float
    notes_created: int
    memories_stored: int
    resources_added: int
    applications_sent: int
    ai_insights: str
    highlights: List[str]
    recommendations: List[str]
