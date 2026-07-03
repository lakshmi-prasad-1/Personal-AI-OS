from __future__ import annotations

from typing import Any, Dict


class ResourceIntelligenceEngine:
    def extract_metadata(self, text: str) -> Dict[str, Any]:
        lowered = text.lower()
        topics = []
        technologies = []
        if "docker" in lowered:
            topics.append("Docker")
            technologies.append("Docker")
        if "kubernetes" in lowered:
            topics.append("Kubernetes")
            technologies.append("Kubernetes")
        return {
            "topics": topics or ["General"],
            "technologies": technologies or ["General"],
            "difficulty": "beginner",
            "estimated_study_time": 45,
            "keywords": ["study", "learning"],
            "learning_objectives": ["Understand the fundamentals"],
        }
