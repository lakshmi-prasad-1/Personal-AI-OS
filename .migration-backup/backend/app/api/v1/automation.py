from datetime import datetime, timezone
from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.models.core_models import User
from app.schemas.automation import (
    BackupCreate,
    BackupRead,
    EventCreate,
    EventRead,
    NotificationCreate,
    NotificationRead,
    WeeklyReportResponse,
    WebhookCreate,
    WebhookRead,
    WorkflowCreate,
    WorkflowRead,
    WorkflowRunRead,
)
from app.intelligence.automation_engine import build_weekly_report, create_notification, dispatch_event, run_workflow

router = APIRouter()


@router.post("/events", response_model=EventRead, status_code=status.HTTP_201_CREATED)
def emit_event(event_in: EventCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    event = dispatch_event(event_in.event_type, event_in.payload, source=event_in.source)
    return EventRead(
        id=UUID(int=0),
        user_id=current_user.id,
        event_type=event["event_type"],
        payload=event["payload"],
        source=event.get("source"),
        is_processed=False,
        processed_at=None,
        error=None,
        created_at=event.get("created_at") or datetime.now(timezone.utc),
    )


@router.post("/workflows", response_model=WorkflowRead, status_code=status.HTTP_201_CREATED)
def create_workflow(workflow_in: WorkflowCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    result = run_workflow({"steps": workflow_in.steps})
    return {
        "id": UUID(int=0),
        "user_id": current_user.id,
        **workflow_in.model_dump(),
        "is_active": True,
        "run_count": 0,
        "last_run_at": None,
        "created_at": datetime.now(timezone.utc),
        "updated_at": None,
        "result": result,
    }


@router.post("/notifications", response_model=NotificationRead, status_code=status.HTTP_201_CREATED)
def send_notification(notification_in: NotificationCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    notification = create_notification(notification_in.channel, notification_in.title, notification_in.body, metadata=notification_in.metadata)
    return NotificationRead(
        id=UUID(int=0),
        user_id=current_user.id,
        channel=notification["channel"],
        title=notification["title"],
        body=notification["body"],
        status=notification.get("status", "pending"),
        sent_at=None,
        read_at=None,
        metadata=notification.get("metadata", {}),
        error=None,
        created_at=datetime.now(timezone.utc),
    )


@router.post("/webhooks", response_model=WebhookRead, status_code=status.HTTP_201_CREATED)
def create_webhook(webhook_in: WebhookCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return {
        "id": UUID(int=0),
        "user_id": current_user.id,
        "name": webhook_in.name,
        "description": webhook_in.description,
        "path": webhook_in.path,
        "is_active": True,
        "trigger_workflow_id": webhook_in.trigger_workflow_id,
        "received_count": 0,
        "last_received_at": None,
        "created_at": datetime.now(timezone.utc),
    }


@router.post("/backups", response_model=BackupRead, status_code=status.HTTP_201_CREATED)
def create_backup(backup_in: BackupCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return {
        "id": UUID(int=0),
        "user_id": current_user.id,
        "backup_type": backup_in.backup_type,
        "file_path": f"/backups/{backup_in.backup_type}.json",
        "size_bytes": 0,
        "checksum": None,
        "status": "completed",
        "storage_provider": backup_in.storage_provider,
        "version": 1,
        "created_at": datetime.now(timezone.utc),
    }


@router.get("/weekly-reports", response_model=WeeklyReportResponse)
def weekly_report(current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    report = build_weekly_report(tasks_completed=0, habits_completed=0, focus_hours=0.0)
    return WeeklyReportResponse(**report)
