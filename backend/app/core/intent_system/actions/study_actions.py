from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.intent_system.action_executor import BaseAction, ActionResult
from app.core.intent_system.intent_classifier import Intent, IntentType
from app.models.core_models import User
from app.models.productivity_models import Task, Goal, Habit
from datetime import datetime, timedelta


class StudyActions(BaseAction):
    """Actions related to study assistance and learning"""
    
    def can_handle(self, intent_type: IntentType) -> bool:
        return intent_type in [
            IntentType.STUDY_PLAN,
            IntentType.WHAT_TO_STUDY,
            IntentType.STUDY_PROGRESS,
            IntentType.UPDATE_STUDY_PROGRESS
        ]
    
    async def execute(self, intent: Intent) -> ActionResult:
        if intent.intent_type == IntentType.WHAT_TO_STUDY:
            return await self._what_to_study(intent)
        elif intent.intent_type == IntentType.STUDY_PROGRESS:
            return await self._study_progress(intent)
        elif intent.intent_type == IntentType.UPDATE_STUDY_PROGRESS:
            return await self._update_study_progress(intent)
        elif intent.intent_type == IntentType.STUDY_PLAN:
            return await self._study_plan(intent)
        
        return ActionResult(success=False, message="Unknown study action")
    
    async def _what_to_study(self, intent: Intent) -> ActionResult:
        """Generate optimal study plan based on current state"""
        try:
            # Analyze user's current situation
            analysis = await self._analyze_study_situation()
            
            # Generate recommendations
            recommendations = self._generate_study_recommendations(analysis)
            
            return ActionResult(
                success=True,
                message=f"Based on your current progress, here's what I recommend studying:",
                data={
                    "analysis": analysis,
                    "recommendations": recommendations
                }
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to generate study plan: {str(e)}")
    
    async def _study_progress(self, intent: Intent) -> ActionResult:
        """Show study progress"""
        try:
            # Get completed tasks
            task_query = select(Task).where(
                Task.user_id == self.user.id,
                Task.status == "completed"
            )
            task_result = await self.db.execute(task_query)
            completed_tasks = task_result.scalars().all()
            
            # Get active goals
            goal_query = select(Goal).where(
                Goal.user_id == self.user.id,
                Goal.is_active == True
            )
            goal_result = await self.db.execute(goal_query)
            active_goals = goal_result.scalars().all()
            
            # Get habit streaks
            habit_query = select(Habit).where(
                Habit.user_id == self.user.id,
                Habit.is_active == True
            )
            habit_result = await self.db.execute(habit_query)
            active_habits = habit_result.scalars().all()
            
            progress_summary = {
                "completed_tasks": len(completed_tasks),
                "active_goals": len(active_goals),
                "active_habits": len(active_habits),
                "habit_streaks": {h.name: h.streak for h in active_habits}
            }
            
            message = f"Study Progress:\n"
            message += f"- Completed {len(completed_tasks)} tasks\n"
            message += f"- {len(active_goals)} active goals\n"
            message += f"- {len(active_habits)} active study habits\n"
            
            for habit in active_habits:
                message += f"- {habit.name}: {habit.streak} day streak\n"
            
            return ActionResult(
                success=True,
                message=message,
                data=progress_summary
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to get study progress: {str(e)}")
    
    async def _update_study_progress(self, intent: Intent) -> ActionResult:
        """Update study progress (delegated to task completion)"""
        # This is handled by task_actions.complete_task
        return ActionResult(
            success=True,
            message="Study progress updated. Great work!",
            follow_up_actions=["generate_daily_summary"]
        )
    
    async def _study_plan(self, intent: Intent) -> ActionResult:
        """Generate a comprehensive study plan"""
        return await self._what_to_study(intent)
    
    async def _analyze_study_situation(self) -> dict:
        """Analyze user's current study situation"""
        analysis = {
            "pending_tasks": 0,
            "upcoming_deadlines": [],
            "weak_areas": [],
            "goal_progress": {}
        }
        
        # Get pending tasks
        task_query = select(Task).where(
            Task.user_id == self.user.id,
            Task.status == "pending"
        )
        task_result = await self.db.execute(task_query)
        pending_tasks = task_result.scalars().all()
        analysis["pending_tasks"] = len(pending_tasks)
        
        # Get upcoming deadlines
        now = datetime.utcnow()
        for task in pending_tasks:
            if task.due_date and task.due_date > now:
                days_until = (task.due_date - now).days
                if days_until <= 7:
                    analysis["upcoming_deadlines"].append({
                        "task": task.title,
                        "days": days_until
                    })
        
        # Get goal progress
        goal_query = select(Goal).where(
            Goal.user_id == self.user.id,
            Goal.is_active == True
        )
        goal_result = await self.db.execute(goal_query)
        goals = goal_result.scalars().all()
        
        for goal in goals:
            progress = 0
            if goal.target_value and goal.current_value:
                progress = (goal.current_value / goal.target_value) * 100
            analysis["goal_progress"][goal.title] = progress
        
        return analysis
    
    def _generate_study_recommendations(self, analysis: dict) -> List[str]:
        """Generate study recommendations based on analysis"""
        recommendations = []
        
        # Prioritize upcoming deadlines
        if analysis["upcoming_deadlines"]:
            deadline = analysis["upcoming_deadlines"][0]
            recommendations.append(
                f"Priority: {deadline['task']} due in {deadline['days']} days"
            )
        
        # Check goal progress
        for goal, progress in analysis["goal_progress"].items():
            if progress < 50:
                recommendations.append(f"Focus on: {goal} (only {progress:.0f}% complete)")
        
        # General recommendations
        if analysis["pending_tasks"] > 5:
            recommendations.append("Consider breaking down large tasks into smaller ones")
        
        if not recommendations:
            recommendations.append("Continue with your current study plan")
        
        return recommendations
