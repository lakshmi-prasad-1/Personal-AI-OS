import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, func, Float, ForeignKey, Boolean, Integer, Text
from sqlalchemy.dialects.postgresql import UUID, TEXT, JSONB
from sqlalchemy.orm import relationship
from app.models.base import Base


# ---------------------------------------------------------------------------
# Event Engine (Pub/Sub)
# ---------------------------------------------------------------------------
class Event(Base):
    __tablename__ = "events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    event_type = Column(String, nullable=False, index=True)  # memory.created, task.completed, resource.saved, etc.
    payload = Column(JSONB, default=dict)
    source = Column(String, nullable=True)         # api, system, webhook, voice
    is_processed = Column(Boolean, default=False, index=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error = Column(TEXT, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Workflow Engine
# ---------------------------------------------------------------------------
class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(TEXT, nullable=True)
    trigger_type = Column(String, nullable=False)  # event, schedule, webhook, manual
    trigger_config = Column(JSONB, default=dict)   # {event_type: "resource.saved"} or {cron: "0 9 * * *"}
    steps = Column(JSONB, default=list)            # [{action, config, on_success, on_failure}]
    is_active = Column(Boolean, default=True, index=True)
    run_count = Column(Integer, default=0)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    runs = relationship("WorkflowRun", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    trigger_event_id = Column(UUID(as_uuid=True), ForeignKey("events.id", ondelete="SET NULL"), nullable=True)
    status = Column(String, default="running", index=True)  # running, success, failed, cancelled
    steps_completed = Column(Integer, default=0)
    result = Column(JSONB, nullable=True)
    error = Column(TEXT, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    workflow = relationship("Workflow", back_populates="runs")


# ---------------------------------------------------------------------------
# Notification Service
# ---------------------------------------------------------------------------
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel = Column(String, nullable=False, index=True)  # email, telegram, discord, push, in_app
    title = Column(String, nullable=False)
    body = Column(TEXT, nullable=False)
    status = Column(String, default="pending", index=True)  # pending, sent, failed, read
    sent_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    notification_metadata = Column(JSONB, default=dict)   # channel-specific data: {to_email, chat_id, etc.}
    error = Column(TEXT, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Backup Service
# ---------------------------------------------------------------------------
class BackupRecord(Base):
    __tablename__ = "backup_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    backup_type = Column(String, nullable=False)    # full, incremental, memories, notes
    file_path = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=True)
    checksum = Column(String, nullable=True)
    status = Column(String, default="pending")      # pending, completed, failed
    storage_provider = Column(String, nullable=True)  # local, gdrive, dropbox, onedrive
    version = Column(Integer, default=1)
    backup_metadata = Column(JSONB, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Webhook Endpoints (n8n compatible)
# ---------------------------------------------------------------------------
class WebhookEndpoint(Base):
    __tablename__ = "webhook_endpoints"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(TEXT, nullable=True)
    path = Column(String, unique=True, nullable=False)  # /webhooks/{path}
    secret = Column(String, nullable=True)              # HMAC secret for verification
    is_active = Column(Boolean, default=True)
    trigger_workflow_id = Column(UUID(as_uuid=True), ForeignKey("workflows.id", ondelete="SET NULL"), nullable=True)
    received_count = Column(Integer, default=0)
    last_received_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
