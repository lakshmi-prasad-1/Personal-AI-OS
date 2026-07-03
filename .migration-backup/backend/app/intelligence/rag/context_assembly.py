import asyncio
from typing import AsyncGenerator, List, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.config import settings
from app.models.core_models import Chat
from app.intelligence.brain.brain_service import brain_service
from app.intelligence.memory.memory_service import process_after_chat_message
from app.intelligence.reasoning_layer import ReasoningLayer
from app.intelligence.recommendation_engine import RecommendationEngine
from app.intelligence.routing.llm_client import is_openai_configured
from app.repositories import chat_repo
from app.schemas.chat import MessageCreate

_reasoning_layer = ReasoningLayer()
_recommendation_engine = RecommendationEngine()

try:
    from openai import AsyncOpenAI
except Exception:
    AsyncOpenAI = None

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if AsyncOpenAI is not None else None


async def stream_chat_response(
    db: AsyncSession,
    user_id: UUID,
    chat: Chat,
    user_message: str,
) -> AsyncGenerator[str, None]:
    """Assemble brain context, stream LLM response, persist messages, and update memories."""
    user_msg = await chat_repo.create_message(
        db, chat.id, MessageCreate(role="user", content=user_message)
    )

    reasoning = await _reasoning_layer.reason(db, user_id, user_message)
    brain_context = reasoning["context"]
    recommendations = _recommendation_engine.recommend({
        "query": user_message,
        "entities": reasoning.get("entities", []),
        "profile": {
            "goals": [],
            "skills": [],
        },
    })
    if recommendations:
        brain_context["sections"].append({
            "name": "recommendations",
            "content": "\n".join(f"- {r['title']}: {r['reason']}" for r in recommendations),
        })
        brain_context["assembled_prompt"] = "\n\n".join(
            f"## {s['name'].replace('_', ' ').title()}\n{s['content']}" for s in brain_context["sections"]
        )
    messages_payload: List[Dict[str, str]] = brain_service.context_messages(brain_context)

    for msg in chat.messages:
        messages_payload.append({"role": msg.role, "content": msg.content})
    messages_payload.append({"role": "user", "content": user_message})

    full_response = ""

    if not is_openai_configured():
        full_response = (
            "I'm your AI Brain assistant. Configure OPENAI_API_KEY for live responses. "
            "I can still learn from our conversation — your message was saved."
        )
        await chat_repo.create_message(db, chat.id, MessageCreate(role="assistant", content=full_response))
        yield f"data: {full_response}\n\n"
        yield "data: [DONE]\n\n"
        asyncio.create_task(_background_memory_update(db, user_id, user_message, full_response, user_msg.id))
        return

    response_stream = await client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=messages_payload,
        stream=True,
        temperature=0.7,
    )

    async for chunk in response_stream:
        if chunk.choices[0].delta.content is not None:
            content = chunk.choices[0].delta.content
            full_response += content
            yield f"data: {content}\n\n"

    await chat_repo.create_message(db, chat.id, MessageCreate(role="assistant", content=full_response))
    yield "data: [DONE]\n\n"

    asyncio.create_task(_background_memory_update(db, user_id, user_message, full_response, user_msg.id))


async def _background_memory_update(
    db: AsyncSession,
    user_id: UUID,
    user_message: str,
    assistant_response: str,
    source_message_id: UUID,
) -> None:
    """Run memory extraction after chat without blocking the SSE stream."""
    try:
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            await process_after_chat_message(
                session, user_id, user_message, assistant_response, source_message_id
            )
    except Exception as exc:
        print(f"Background memory update failed: {exc}")
