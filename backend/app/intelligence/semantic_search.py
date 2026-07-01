from typing import Any, Dict, List
import re


def placeholder_similarity_service(query: str, candidates: List[str]) -> List[Dict[str, Any]]:
    """Simple deterministic placeholder search for environments without embeddings."""
    normalized_query = re.sub(r"[^a-z0-9]+", " ", query.lower()).strip()
    query_terms = set(normalized_query.split()) if normalized_query else set()

    scored: List[Dict[str, Any]] = []
    for candidate in candidates:
        normalized_candidate = re.sub(r"[^a-z0-9]+", " ", candidate.lower()).strip()
        candidate_terms = set(normalized_candidate.split()) if normalized_candidate else set()
        overlap = len(query_terms & candidate_terms)
        score = min(1.0, 0.35 + (overlap * 0.25) + (1.0 if normalized_query and normalized_query in normalized_candidate else 0.0))
        scored.append({"text": candidate, "score": round(score, 3)})

    scored.sort(key=lambda item: item["score"], reverse=True)
    return scored
