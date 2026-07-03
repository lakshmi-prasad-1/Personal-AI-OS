import json
from typing import List
from app.intelligence.prompts.prompt_manager import prompt_manager
from app.intelligence.routing.llm_client import generate_chat_response, generate_embedding, count_tokens
from app.schemas.memory import MemoryExtractionResult, MemoryExtractedItem

async def extract_memories_from_text(user_input: str) -> List[MemoryExtractedItem]:
    """Analyze raw text and determine which memories should be extracted and stored."""
    prompt = prompt_manager.get_prompt("memory_extraction", user_input=user_input)
    messages = [{"role": "system", "content": prompt}]

    response_text = await generate_chat_response(messages, temperature=0.2)

    try:
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}") + 1
        json_str = response_text[start_idx:end_idx]

        data = json.loads(json_str)
        result = MemoryExtractionResult(**data)
        return result.memories
    except Exception as exc:
        print(f"Failed to extract memory: {exc}")
        return []


async def extract_memories_with_metadata(user_input: str) -> List[MemoryExtractedItem]:
    """Convenience wrapper that also returns token metadata for observability."""
    memories = await extract_memories_from_text(user_input)
    return memories


def estimate_extraction_cost(user_input: str) -> int:
    """Return a simple token estimate for prompt observability."""
    return count_tokens(user_input)

async def process_and_vectorize_memory(memory_item: MemoryExtractedItem) -> List[float]:
    """
    Creates the embedding vector for the memory to be stored in pgvector.
    """
    text_to_embed = f"{memory_item.title}: {memory_item.description} (Category: {memory_item.category}, Tags: {', '.join(memory_item.tags)})"
    vector = await generate_embedding(text_to_embed)
    return vector
