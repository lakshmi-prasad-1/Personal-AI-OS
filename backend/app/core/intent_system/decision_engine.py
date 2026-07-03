from typing import Dict, List, Any, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.core_models import User
from app.models.productivity_models import Task, Goal, Resource
from app.core.intent_system.context_manager import ContextManager


class Recommendation(BaseModel):
    """Represents a recommendation from the decision engine"""
    priority: str  # high, medium, low
    action: str
    reasoning: str
    related_data: Optional[Dict[str, Any]] = None


class DecisionEngine:
    """Intelligent decision engine for recommendations"""
    
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
        self.context_manager = ContextManager(db, user)
    
    async def generate_recommendations(self) -> List[Recommendation]:
        """Generate intelligent recommendations based on user state"""
        recommendations = []
        
        # Build context
        context = await self.context_manager.build_context()
        
        # Analyze different aspects
        recommendations.extend(await self._analyze_task_situation(context))
        recommendations.extend(await self._analyze_goal_progress(context))
        recommendations.extend(await self._analyze_skill_gaps(context))
        recommendations.extend(await self._analyze_time_optimization(context))
        
        # Sort by priority
        priority_order = {"high": 0, "medium": 1, "low": 2}
        recommendations.sort(key=lambda r: priority_order.get(r.priority, 3))
        
        return recommendations[:5]  # Return top 5 recommendations
    
    async def _analyze_task_situation(self, context) -> List[Recommendation]:
        """Analyze task situation and generate recommendations"""
        recommendations = []
        
        # Check for overdue tasks
        from datetime import datetime, timedelta
        
        task_query = select(Task).where(
            Task.user_id == self.user.id,
            Task.status == "pending"
        )
        
        result = await self.db.execute(task_query)
        tasks = result.scalars().all()
        
        now = datetime.utcnow()
        overdue_tasks = [t for t in tasks if t.due_date and t.due_date < now]
        
        if overdue_tasks:
            recommendations.append(Recommendation(
                priority="high",
                action=f"Focus on {len(overdue_tasks)} overdue tasks",
                reasoning=f"You have {len(overdue_tasks)} tasks that are past due",
                related_data={"overdue_count": len(overdue_tasks)}
            ))
        
        # Check for urgent tasks (due within 24 hours)
        urgent_tasks = [t for t in tasks if t.due_date and t.due_date <= now + timedelta(hours=24)]
        
        if urgent_tasks:
            recommendations.append(Recommendation(
                priority="high",
                action=f"Prioritize {len(urgent_tasks)} urgent tasks due soon",
                reasoning=f"You have {len(urgent_tasks)} tasks due within 24 hours",
                related_data={"urgent_count": len(urgent_tasks)}
            ))
        
        # Check for task overload
        if len(tasks) > 10:
            recommendations.append(Recommendation(
                priority="medium",
                action="Consider delegating or postponing some tasks",
                reasoning=f"You have {len(tasks)} pending tasks, which might be overwhelming",
                related_data={"total_tasks": len(tasks)}
            ))
        
        return recommendations
    
    async def _analyze_goal_progress(self, context) -> List[Recommendation]:
        """Analyze goal progress and generate recommendations"""
        recommendations = []
        
        goal_query = select(Goal).where(
            Goal.user_id == self.user.id,
            Goal.is_active == True
        )
        
        result = await self.db.execute(goal_query)
        goals = result.scalars().all()
        
        for goal in goals:
            if goal.target_value and goal.current_value:
                progress = (goal.current_value / goal.target_value) * 100
                
                if progress < 25:
                    recommendations.append(Recommendation(
                        priority="high",
                        action=f"Increase focus on: {goal.title}",
                        reasoning=f"Goal is only {progress:.0f}% complete - needs attention",
                        related_data={"goal": goal.title, "progress": progress}
                    ))
                elif progress < 50:
                    recommendations.append(Recommendation(
                        priority="medium",
                        action=f"Make progress on: {goal.title}",
                        reasoning=f"Goal is {progress:.0f}% complete - keep pushing",
                        related_data={"goal": goal.title, "progress": progress}
                    ))
                elif progress >= 100:
                    recommendations.append(Recommendation(
                        priority="low",
                        action=f"Celebrate completion of: {goal.title}",
                        reasoning=f"Goal achieved! Time to set new goals",
                        related_data={"goal": goal.title, "progress": progress}
                    ))
        
        return recommendations
    
    async def _analyze_skill_gaps(self, context) -> List[Recommendation]:
        """Analyze skill gaps and recommend learning resources"""
        recommendations = []
        
        # Check for missing skills mentioned in career context
        if context.career_context == "job_search":
            # Simulate skill gap analysis
            common_missing_skills = ["docker", "kubernetes", "aws", "system design"]
            
            for skill in common_missing_skills:
                # Check if user has resources for this skill
                resource_query = select(Resource).where(
                    Resource.user_id == self.user.id,
                    Resource.category.ilike(f"%{skill}%")
                )
                
                result = await self.db.execute(resource_query)
                has_resources = result.scalar_one_or_none()
                
                if not has_resources:
                    recommendations.append(Recommendation(
                        priority="medium",
                        action=f"Add {skill} resources to your learning vault",
                        reasoning=f"{skill} is commonly required in job descriptions",
                        related_data={"skill": skill}
                    ))
        
        return recommendations
    
    async def _analyze_time_optimization(self, context) -> List[Recommendation]:
        """Analyze time usage and generate optimization recommendations"""
        recommendations = []
        
        # Check if user has too many tasks for current time context
        if context.time_context == "evening" and len(context.active_tasks) > 5:
            recommendations.append(Recommendation(
                priority="low",
                action="Plan tomorrow's tasks instead of starting new ones",
                reasoning="Evening is better for planning than starting complex tasks",
                related_data={"task_count": len(context.active_tasks)}
            ))
        
        if context.time_context == "morning" and context.active_tasks:
            recommendations.append(Recommendation(
                priority="medium",
                action="Start your most important task now",
                reasoning="Morning is the best time for deep work on important tasks",
                related_data={"suggested_task": context.active_tasks[0] if context.active_tasks else None}
            ))
        
        return recommendations
    
    async def get_action_suggestion(self, user_input: str) -> Optional[str]:
        """Suggest an action based on user input and current state"""
        context = await self.context_manager.build_context()
        
        # Analyze user input for implicit needs
        input_lower = user_input.lower()
        
        if "tired" in input_lower or "exhausted" in input_lower:
            return "Would you like me to suggest a break or help you reschedule some tasks?"
        
        if "stuck" in input_lower or "help" in input_lower:
            return "I can help break down your current task into smaller steps. Want me to do that?"
        
        if "bored" in input_lower:
            if context.active_tasks:
                return f"Maybe switch to a different task? You have {len(context.active_tasks)} to choose from."
            return "Would you like me to suggest some learning resources or project ideas?"
        
        if "overwhelmed" in input_lower:
            return "Let me help you prioritize. I'll analyze your tasks and suggest which to focus on first."
        
        return None
