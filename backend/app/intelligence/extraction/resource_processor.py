import re
from typing import List
from uuid import UUID

from PyPDF2 import PdfReader

from app.core.database import AsyncSessionLocal
from app.intelligence.prompts.prompt_manager import prompt_manager
from app.intelligence.routing.llm_client import generate_chat_response, generate_embedding
from app.intelligence.graph.graph_builder import sync_entity_to_graph
from app.repositories.resource_repo import update_resource_intelligence

async def process_resource_background(resource_id: UUID, file_path: str, file_type: str):
    """
    Background task to parse the document, generate a summary, and create a vector embedding.
    """
    try:
        content = ""
        # 1. Parse content based on file type
        if file_type == "application/pdf":
            reader = PdfReader(file_path)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    content += text + "\n"
        elif file_type.startswith("text/"):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        else:
            # Unsupported parsing for now
            return

        # Truncate content to avoid token limits for summary
        max_chars = 15000
        truncated_content = content[:max_chars]
        
        # 2. Generate Summary
        prompt = prompt_manager.get_prompt("resource_summary", content=truncated_content)
        summary = await generate_chat_response([{"role": "system", "content": prompt}], temperature=0.3)
        
        # 3. Generate Embedding of the summary (for semantic search of the document)
        embedding = await generate_embedding(summary)
        
        # 4. Update Database
        # Note: Since this is a background task running in another thread/loop context,
        # we create a new DB session.
        async with AsyncSessionLocal() as db:
            resource = await update_resource_intelligence(db, resource_id, summary, embedding)
            if resource:
                await sync_entity_to_graph(
                    db,
                    user_id=resource.user_id,
                    entity_type="Resource",
                    entity_id=resource.id,
                    label=resource.title,
                    tags=resource.tags or [],
                    related_labels=_extract_skill_labels(summary),
                )
            
    except Exception as e:
        print(f"Error processing resource {resource_id}: {e}")


def _extract_skill_labels(summary: str) -> List[str]:
    """Heuristic skill/topic extraction for graph linking."""
    candidates = re.findall(r"\b[A-Z][a-zA-Z\+#\.]{2,}\b", summary)
    return list({c for c in candidates if len(c) <= 30})[:8]
