from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.intelligence.rag.context_assembly import stream_chat_response
from app.models.core_models import User
from app.repositories import chat_repo
from app.schemas.chat import ChatCreate, ChatRead, ChatResponseRequest, ChatSearchRequest, ChatUpdate

router = APIRouter()


@router.post("/", response_model=ChatRead, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_in: ChatCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat conversation for the current user."""
    return await chat_repo.create_chat(db, current_user.id, chat_in)


@router.get("/", response_model=List[ChatRead])
async def list_chats(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """List all chat conversations for the current user."""
    return await chat_repo.get_user_chats(db, current_user.id)


@router.get("/{chat_id}", response_model=ChatRead)
async def get_chat(
    chat_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch a single chat including its messages."""
    chat = await chat_repo.get_chat(db, chat_id, current_user.id)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


@router.patch("/{chat_id}", response_model=ChatRead)
async def update_chat(
    chat_id: UUID,
    chat_in: ChatUpdate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update a chat title or pin state."""
    chat = await chat_repo.update_chat(db, chat_id, current_user.id, chat_in)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    return chat


@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    chat_id: UUID,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat and its messages."""
    deleted = await chat_repo.delete_chat(db, chat_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Chat not found")


@router.post("/search")
async def search_chats(
    search_request: ChatSearchRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Search chat titles for a given query."""
    chats = await chat_repo.search_chats(db, current_user.id, search_request.query, search_request.limit)
    return {"results": chats}


@router.post("/{chat_id}/message")
async def send_message_stream(
    chat_id: UUID,
    request: ChatResponseRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Send a user message and stream the assistant response via SSE."""
    chat = await chat_repo.get_chat_with_messages(db, chat_id)
    if not chat or chat.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Chat not found")

    return StreamingResponse(
        stream_chat_response(db, current_user.id, chat, request.message),
        media_type="text/event-stream",
    )
