from typing import List, Optional


def count_tokens(text: str) -> int:
    """Estimate token usage using a lightweight whitespace-based approximation."""
    return max(1, len(text.split()))

try:
    from openai import AsyncOpenAI
except Exception:  # pragma: no cover - fallback for older openai versions
    AsyncOpenAI = None

from app.core.config import settings


# Initialize the async OpenAI client when the dependency supports it.
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY) if AsyncOpenAI is not None else None

async def generate_chat_response(
    messages: List[dict],
    model: str = "gpt-4-turbo-preview",
    temperature: float = 0.7,
    max_tokens: int = 1000,
) -> str:
    """Core routing for standard conversational responses and RAG generation."""
    if client is None or not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "sk-placeholder":
        return "Assistant response placeholder. Configure OpenAI to enable live generation."

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return response.choices[0].message.content
    except Exception as exc:  # pragma: no cover - exercised in runtime failures
        return f"Assistant response placeholder due to an upstream error: {exc}"

def zero_embedding() -> List[float]:
    """Return a zero vector matching pgvector column dimension."""
    return [0.0] * settings.EMBEDDING_DIMENSION


def is_openai_configured() -> bool:
    return bool(client and settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "sk-placeholder")


async def generate_embedding(text: str, model: str | None = None) -> List[float] | None:
    """Generate vector embeddings for semantic search and storage."""
    if not is_openai_configured():
        return None

    text = text.replace("\n", " ")
    try:
        response = await client.embeddings.create(
            input=[text],
            model=model or settings.OPENAI_EMBEDDING_MODEL,
        )
        return response.data[0].embedding
    except Exception:
        return None
