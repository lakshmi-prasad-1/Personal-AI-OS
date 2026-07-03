from typing import List, Optional
from uuid import UUID

from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.intelligence.routing.llm_client import generate_embedding
from app.models.core_models import Idea
from app.schemas.idea import IdeaCreate, IdeaUpdate


async def create_idea(db: AsyncSession, user_id: UUID, idea_in: IdeaCreate) -> Idea:
    try:
        embedding = await generate_embedding(f"{idea_in.title}: {idea_in.content}")
    except Exception:
        embedding = None

    db_idea = Idea(
        user_id=user_id,
        title=idea_in.title,
        content=idea_in.content,
        category=idea_in.category.value if hasattr(idea_in.category, "value") else str(idea_in.category),
        tags=idea_in.tags or [],
        status=idea_in.status.value if hasattr(idea_in.status, "value") else str(idea_in.status),
        priority=idea_in.priority,
        embedding=embedding,
    )
    db.add(db_idea)
    await db.commit()
    await db.refresh(db_idea)
    return db_idea


async def get_idea(db: AsyncSession, idea_id: UUID, user_id: UUID) -> Optional[Idea]:
    result = await db.execute(select(Idea).where(Idea.id == idea_id, Idea.user_id == user_id))
    return result.scalars().first()


async def update_idea(db: AsyncSession, idea_id: UUID, user_id: UUID, updates: IdeaUpdate) -> Optional[Idea]:
    update_data = updates.model_dump(exclude_unset=True)
    if not update_data:
        return await get_idea(db, idea_id, user_id)

    if "category" in update_data and update_data["category"] is not None:
        update_data["category"] = update_data["category"].value if hasattr(update_data["category"], "value") else update_data["category"]
    if "status" in update_data and update_data["status"] is not None:
        update_data["status"] = update_data["status"].value if hasattr(update_data["status"], "value") else update_data["status"]

    await db.execute(update(Idea).where(Idea.id == idea_id, Idea.user_id == user_id).values(**update_data))
    await db.commit()
    return await get_idea(db, idea_id, user_id)


async def delete_idea(db: AsyncSession, idea_id: UUID, user_id: UUID) -> bool:
    result = await db.execute(delete(Idea).where(Idea.id == idea_id, Idea.user_id == user_id))
    await db.commit()
    return result.rowcount > 0


async def get_user_ideas(db: AsyncSession, user_id: UUID) -> List[Idea]:
    result = await db.execute(select(Idea).where(Idea.user_id == user_id).order_by(Idea.created_at.desc()))
    return result.scalars().all()
