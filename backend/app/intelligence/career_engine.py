from typing import Any, Dict, List


def analyze_resume_against_jd(resume_text: str, job_description: str) -> Dict[str, Any]:
    """Create a simple AI-style resume analysis payload for a job description."""
    resume_terms = set(resume_text.lower().split())
    jd_terms = set(job_description.lower().split())
    overlap = sorted(resume_terms & jd_terms)
    matched_skills = [term for term in overlap if len(term) > 2][:8]
    missing_skills = [term for term in sorted(jd_terms - resume_terms) if len(term) > 2][:8]
    ats_score = round(min(100.0, 40.0 + (len(matched_skills) * 6.0)), 2)

    return {
        "ats_score": ats_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "suggestions": [
            "Add quantified achievements and impact statements.",
            "Mention the missing skills explicitly in your summary.",
        ],
        "cover_letter": "Tailored cover letter draft based on the supplied role and experience.",
    }


def build_skill_gap_report(target_role: str, current_skills: List[Dict[str, Any]], job_description: str) -> Dict[str, Any]:
    required_skills = [
        {"name": "FastAPI", "importance": 0.9},
        {"name": "Docker", "importance": 0.7},
        {"name": "AWS", "importance": 0.6},
    ]
    gap_analysis = [
        {"skill": skill["name"], "gap_level": "medium" if skill["name"] not in {entry.get("name", "").lower() for entry in current_skills} else "low"}
        for skill in required_skills
    ]
    roadmap = [
        {
            "week": 1,
            "tasks": ["Build one FastAPI project", "Document your learnings"],
            "resources": ["FastAPI tutorial"],
            "milestones": ["Ship a small API"],
        }
    ]

    return {
        "target_role": target_role,
        "required_skills": required_skills,
        "gap_analysis": gap_analysis,
        "roadmap": roadmap,
        "ai_analysis": f"Focus on the skills most likely to match the role described in the job description: {job_description[:80]}",
    }


def build_dashboard(applications: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(applications)
    by_status: Dict[str, int] = {}
    for application in applications:
        status = application.get("status", "pending")
        by_status[status] = by_status.get(status, 0) + 1

    offers = sum(1 for application in applications if application.get("status") == "offer")
    success_rate = round((offers / total) * 100, 2) if total else 0.0
    interview_count = sum(1 for application in applications if application.get("status") == "interview")

    return {
        "total": total,
        "by_status": by_status,
        "success_rate": success_rate,
        "interview_rate": round((interview_count / total) * 100, 2) if total else 0.0,
        "recent": applications[-3:],
    }
