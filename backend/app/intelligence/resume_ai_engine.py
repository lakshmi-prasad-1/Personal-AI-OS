from __future__ import annotations

from typing import Any, Dict


class ResumeAIEngine:
    def build_resume_variant(self, resume: Dict[str, Any], target_role: str, job_description: str | None = None) -> Dict[str, Any]:
        title = f"{resume.get('title', 'Resume')} - {target_role}"
        content = resume.get("content", "")
        improved_content = f"{content}\n\nTarget role: {target_role}\nHighlights: quantified impact, modern stack, measurable outcomes"
        if job_description:
            improved_content += f"\nJob focus: {job_description[:120]}"

        return {
            "version": 2,
            "title": title,
            "content": improved_content,
            "target_role": target_role,
            "cover_letter": f"Dear Hiring Team, I am excited to apply for the {target_role} role.",
            "ats_score": 84.0,
            "missing_skills": ["System Design", "Docker"],
            "suggestions": ["Add measurable project impact", "Tailor bullets to the role"],
        }
