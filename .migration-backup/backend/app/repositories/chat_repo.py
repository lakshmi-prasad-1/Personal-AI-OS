from typing import List, Optional
from uuid import UUID

from sqlalchemy import delete, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.models.core_models import Chat, Message
from app.schemas.chat import ChatCreate, ChatUpdate, MessageCreate


async def create_chat(db: AsyncSession, user_id: UUID, chat_in: ChatCreate) -> Chat:
    db_chat = Chat(user_id=user_id, title=chat_in.title.strip())
    db.add(db_chat)
    await db.commit()
    await db.refresh(db_chat)
    return db_chat


async def get_chat(db: AsyncSession, chat_id: UUID, user_id: UUID) -> Optional[Chat]:
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.user_id == user_id).options(selectinload(Chat.messages)))
    return result.scalars().first()


async def get_user_chats(db: AsyncSession, user_id: UUID) -> List[Chat]:
    result = await db.execute(select(Chat).where(Chat.user_id == user_id).order_by(Chat.updated_at.desc()))
    return result.scalars().all()


async def get_chat_with_messages(db: AsyncSession, chat_id: UUID) -> Optional[Chat]:
    result = await db.execute(select(Chat).where(Chat.id == chat_id).options(selectinload(Chat.messages)))
    return result.scalars().first()


async def update_chat(db: AsyncSession, chat_id: UUID, user_id: UUID, updates: ChatUpdate) -> Optional[Chat]:
    update_data = updates.model_dump(exclude_unset=True)
    if not update_data:
        return await get_chat(db, chat_id, user_id)

    await db.execute(update(Chat).where(Chat.id == chat_id, Chat.user_id == user_id).values(**update_data))
    await db.commit()
    return await get_chat(db, chat_id, user_id)


async def delete_chat(db: AsyncSession, chat_id: UUID, user_id: UUID) -> bool:
    result = await db.execute(delete(Chat).where(Chat.id == chat_id, Chat.user_id == user_id))
    await db.commit()
    return result.rowcount > 0


async def search_chats(db: AsyncSession, user_id: UUID, query: str, limit: int = 10) -> List[Chat]:
    search_pattern = f"%{query.lower()}%"
    result = await db.execute(
        select(Chat)
        .where(Chat.user_id == user_id, Chat.title.ilike(search_pattern))
        .order_by(Chat.updated_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def create_message(db: AsyncSession, chat_id: UUID, message_in: MessageCreate) -> Message:
    db_msg = Message(chat_id=chat_id, role=message_in.role, content=message_in.content)
    db.add(db_msg)
    await db.commit()
    await db.refresh(db_msg)
    return db_msg
