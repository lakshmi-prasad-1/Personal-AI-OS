from datetime import datetime, timezone
from typing import Any, Dict, List


def rank_retrieval_results(candidates: List[Dict[str, Any]], query: str, now_at: datetime | None = None) -> List[Dict[str, Any]]:
    """Blend semantic similarity, recency, and importance into a single relevance score."""
    now = now_at or datetime.now(timezone.utc)
    scored: List[Dict[str, Any]] = []

    for candidate in candidates:
        created_at = candidate.get("created_at")
        age_days = 0.0
        if isinstance(created_at, datetime):
            age_days = max(0.0, (now - created_at).total_seconds() / 86400.0)

        recency_score = max(0.0, 1.0 - (age_days / 180.0))
        importance_score = float(candidate.get("importance_score", 0.0))
        similarity = float(candidate.get("similarity", 0.0))
        relevance_score = round((similarity * 0.6) + (importance_score * 0.25) + (recency_score * 0.15), 4)

        scored.append({
            **candidate,
            "query": query,
            "relevance_score": relevance_score,
            "recency_score": round(recency_score, 4),
        })

    scored.sort(key=lambda item: item["relevance_score"], reverse=True)
    return scored
