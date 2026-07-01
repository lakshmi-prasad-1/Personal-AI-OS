from typing import List, Optional
from uuid import UUID

from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.core_models import Resource
from app.schemas.resource import ResourceCreate, ResourceUpdate


async def create_resource(db: AsyncSession, user_id: UUID, resource_in: ResourceCreate) -> Resource:
    db_resource = Resource(
        user_id=user_id,
        title=resource_in.title,
        description=resource_in.description,
        category=resource_in.category.value if hasattr(resource_in.category, "value") else str(resource_in.category),
        file_path=getattr(resource_in, "file_path", None),
        source_url=resource_in.source_url,
        tags=resource_in.tags or [],
        difficulty=resource_in.difficulty.value if hasattr(resource_in.difficulty, "value") else resource_in.difficulty,
        status=resource_in.status.value if hasattr(resource_in.status, "value") else resource_in.status,
        priority=resource_in.priority,
        notes=resource_in.notes,
    )
    db.add(db_resource)
    await db.commit()
    await db.refresh(db_resource)
    return db_resource


async def get_resource(db: AsyncSession, resource_id: UUID, user_id: UUID) -> Optional[Resource]:
    result = await db.execute(select(Resource).where(Resource.id == resource_id, Resource.user_id == user_id))
    return result.scalars().first()


async def update_resource(db: AsyncSession, resource_id: UUID, user_id: UUID, updates: ResourceUpdate) -> Optional[Resource]:
    update_data = updates.model_dump(exclude_unset=True)
    if not update_data:
        return await get_resource(db, resource_id, user_id)

    if "category" in update_data and update_data["category"] is not None:
        update_data["category"] = update_data["category"].value if hasattr(update_data["category"], "value") else update_data["category"]
    if "difficulty" in update_data and update_data["difficulty"] is not None:
        update_data["difficulty"] = update_data["difficulty"].value if hasattr(update_data["difficulty"], "value") else update_data["difficulty"]
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value if hasattr(update_data["status"], "value") else update_data["status"]

    await db.execute(update(Resource).where(Resource.id == resource_id, Resource.user_id == user_id).values(**update_data))
    await db.commit()
    return await get_resource(db, resource_id, user_id)


async def delete_resource(db: AsyncSession, resource_id: UUID, user_id: UUID) -> bool:
    result = await db.execute(delete(Resource).where(Resource.id == resource_id, Resource.user_id == user_id))
    await db.commit()
    return result.rowcount > 0


async def update_resource_intelligence(
    db: AsyncSession,
    resource_id: UUID,
    summary: str,
    embedding: List[float],
) -> Optional[Resource]:
    result = await db.execute(select(Resource).where(Resource.id == resource_id))
    resource = result.scalars().first()
    if resource:
        resource.ai_summary = summary
        resource.embedding = embedding
        resource.is_processed = True
        await db.commit()
        await db.refresh(resource)
    return resource


async def get_user_resources(db: AsyncSession, user_id: UUID) -> List[Resource]:
    result = await db.execute(select(Resource).where(Resource.user_id == user_id).order_by(Resource.created_at.desc()))
    return result.scalars().all()
