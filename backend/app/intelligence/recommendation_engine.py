"""Explainable recommendations derived from the user's profile and memories."""

from __future__ import annotations

from typing import Any, Dict, List


class RecommendationEngine:
    """Generate simple, explainable recommendations based on the current context."""

    def recommend(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        recommendations: List[Dict[str, Any]] = []
        query = str(context.get("query", "")).lower()
        entities = context.get("entities", [])
        profile = context.get("profile", {})
        goals = profile.get("goals", []) if isinstance(profile, dict) else []
        skills = profile.get("skills", []) if isinstance(profile, dict) else []

        if any(entity.get("type") == "Company" for entity in entities):
            recommendations.append({
                "type": "career_action",
                "title": "Prepare for target company",
                "reason": "Your recent message mentions a target company, so a focused preparation plan would be helpful.",
                "priority": "high",
            })
        if any(entity.get("type") == "Technology" for entity in entities):
            recommendations.append({
                "type": "learning_path",
                "title": "Study the referenced technology",
                "reason": "A referenced technology is present, which often signals a beneficial learning action.",
                "priority": "medium",
            })
        if goals and not skills:
            recommendations.append({
                "type": "profile_completion",
                "title": "Add skills to your profile",
                "reason": "You have goals but few explicit skills in the profile, which limits personalization.",
                "priority": "medium",
            })
        if "resume" in query:
            recommendations.append({
                "type": "resume_improvement",
                "title": "Improve resume alignment",
                "reason": "Resume-related context suggests improving alignment with your current goals and skills.",
                "priority": "medium",
            })
        return recommendations
