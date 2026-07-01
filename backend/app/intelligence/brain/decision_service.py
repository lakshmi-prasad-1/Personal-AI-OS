"""Decision Engine — evaluates context and recommends proactive actions."""

from typing import Any, Dict, List, Optional

from app.intelligence.decision_engine import Rule, RuleEngine


def _build_engine() -> RuleEngine:
    engine = RuleEngine()

    engine.register_rule(Rule(
        name="goal_without_plan",
        description="User mentions goals but has no active projects",
        condition=lambda ctx: bool(ctx.get("goals")) and not ctx.get("current_projects"),
        action=lambda ctx: {
            "rule": "goal_without_plan",
            "action": "suggest_project_planning",
            "reason": "You have defined goals but no active projects. Consider breaking a goal into a project.",
            "priority": "high",
            "payload": {"goals": ctx.get("goals", [])},
        },
    ))

    engine.register_rule(Rule(
        name="skill_gap_signal",
        description="Recent memories mention learning without matching skills in profile",
        condition=lambda ctx: bool(ctx.get("learning_memories")) and len(ctx.get("skills", [])) < 3,
        action=lambda ctx: {
            "rule": "skill_gap_signal",
            "action": "update_skills_profile",
            "reason": "Recent learning activity detected. Update your skills profile to improve context accuracy.",
            "priority": "medium",
            "payload": {"memories": ctx.get("learning_memories", [])},
        },
    ))

    engine.register_rule(Rule(
        name="unprocessed_resources",
        description="User has unprocessed resources",
        condition=lambda ctx: ctx.get("unprocessed_resource_count", 0) > 0,
        action=lambda ctx: {
            "rule": "unprocessed_resources",
            "action": "process_resources",
            "reason": f"You have {ctx['unprocessed_resource_count']} unprocessed resource(s). Processing unlocks smarter answers.",
            "priority": "medium",
            "payload": {"count": ctx["unprocessed_resource_count"]},
        },
    ))

    engine.register_rule(Rule(
        name="sparse_profile",
        description="Profile lacks basic identity fields",
        condition=lambda ctx: not ctx.get("display_name") and not ctx.get("goals") and not ctx.get("skills"),
        action=lambda ctx: {
            "rule": "sparse_profile",
            "action": "complete_profile",
            "reason": "Your AI Brain profile is empty. Add goals, skills, and current work for personalized assistance.",
            "priority": "high",
            "payload": {},
        },
    ))

    engine.register_rule(Rule(
        name="active_ideas_stale",
        description="Multiple exploring ideas without recent activity",
        condition=lambda ctx: ctx.get("active_idea_count", 0) >= 3,
        action=lambda ctx: {
            "rule": "active_ideas_stale",
            "action": "prioritize_ideas",
            "reason": "You have several active ideas. Consider prioritizing one for your next project sprint.",
            "priority": "low",
            "payload": {"count": ctx["active_idea_count"]},
        },
    ))

    return engine


_engine = _build_engine()


async def build_decision_context(db, user_id, query: Optional[str] = None) -> Dict[str, Any]:
    """Gather signals used by decision rules."""
    from sqlalchemy.future import select
    from app.models.core_models import Idea, Memory, Resource
    from app.repositories import profile_repo

    profile = await profile_repo.get_or_create_profile(db, user_id)

    mem_result = await db.execute(
        select(Memory)
        .where(Memory.user_id == user_id, Memory.category.in_(["CodingProgress", "LeetCodeProgress", "Skills"]))
        .order_by(Memory.created_at.desc())
        .limit(5)
    )
    learning_memories = [{"title": m.title, "description": m.description[:100]} for m in mem_result.scalars().all()]

    res_result = await db.execute(
        select(Resource).where(Resource.user_id == user_id, Resource.is_processed == False)
    )
    unprocessed = res_result.scalars().all()

    idea_result = await db.execute(
        select(Idea).where(Idea.user_id == user_id, Idea.status.in_(["raw", "exploring"]))
    )
    active_ideas = idea_result.scalars().all()

    return {
        "query": query or "",
        "display_name": profile.display_name,
        "goals": profile.goals or [],
        "skills": profile.skills or [],
        "current_projects": profile.current_projects or [],
        "learning_memories": learning_memories,
        "unprocessed_resource_count": len(unprocessed),
        "active_idea_count": len(active_ideas),
    }


async def evaluate_decisions(db, user_id, query: Optional[str] = None, extra_context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Run decision engine against current user context."""
    context = await build_decision_context(db, user_id, query)
    if extra_context:
        context.update(extra_context)
    return _engine.evaluate(None, context)
