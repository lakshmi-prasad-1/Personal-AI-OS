import shutil
from pathlib import Path
from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.intelligence.extraction.resource_processor import process_resource_background
from app.models.core_models import User
from app.repositories import resource_repo
from app.schemas.resource import ResourceCreate, ResourceRead, ResourceUpdate

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload", response_model=ResourceRead, status_code=status.HTTP_201_CREATED)
async def upload_resource(
    background_tasks: BackgroundTasks,
    title: Annotated[str, Form()],
    category: Annotated[str, Form()],
    description: Annotated[str, Form()] = None,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload a resource such as a PDF or text file and trigger background processing."""
    file_path = UPLOAD_DIR / f"{current_user.id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    resource_in = ResourceCreate(
        title=title,
        description=description,
        category=category,
        file_path=str(file_path),
    )
    resource = await resource_repo.create_resource(db, current_user.id, resource_in)

    background_tasks.add_task(
        process_resource_background,
        resource_id=resource.id,
        file_path=str(file_path),
        file_type=file.content_type,
    )
    return resource


@router.get("/", response_model=List[ResourceRead])
async def list_resources(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all resources for the current user."""
    return await resource_repo.get_user_resources(db, current_user.id)


@router.get("/{resource_id}", response_model=ResourceRead)
async def get_resource(
    resource_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single resource."""
    resource = await resource_repo.get_resource(db, resource_id, current_user.id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@router.patch("/{resource_id}", response_model=ResourceRead)
async def update_resource(
    resource_id: UUID,
    resource_in: ResourceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update resource metadata."""
    resource = await resource_repo.update_resource(db, resource_id, current_user.id, resource_in)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    resource_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a resource."""
    deleted = await resource_repo.delete_resource(db, resource_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Resource not found")
