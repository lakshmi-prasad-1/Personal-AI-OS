from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.intent_system.action_executor import BaseAction, ActionResult
from app.core.intent_system.intent_classifier import Intent, IntentType
from app.models.core_models import User
from app.models.productivity_models import Task, FocusSession, DailyReview
from datetime import datetime, timedelta


class ProductivityActions(BaseAction):
    """Actions related to productivity optimization"""
    
    def can_handle(self, intent_type: IntentType) -> bool:
        return intent_type in [
            IntentType.PRODUCTIVITY_ANALYSIS,
            IntentType.OPTIMIZE_SCHEDULE,
            IntentType.DAILY_SUMMARY
        ]
    
    async def execute(self, intent: Intent) -> ActionResult:
        if intent.intent_type == IntentType.PRODUCTIVITY_ANALYSIS:
            return await self._productivity_analysis(intent)
        elif intent.intent_type == IntentType.OPTIMIZE_SCHEDULE:
            return await self._optimize_schedule(intent)
        elif intent.intent_type == IntentType.DAILY_SUMMARY:
            return await self._daily_summary(intent)
        
        return ActionResult(success=False, message="Unknown productivity action")
    
    async def _productivity_analysis(self, intent: Intent) -> ActionResult:
        """Analyze user's productivity"""
        try:
            # Get completed tasks today
            today = datetime.utcnow().date()
            task_query = select(Task).where(
                Task.user_id == self.user.id,
                Task.completed_at >= today,
                Task.status == "completed"
            )
            task_result = await self.db.execute(task_query)
            completed_today = task_result.scalars().all()
            
            # Get focus sessions today
            focus_query = select(FocusSession).where(
                FocusSession.user_id == self.user.id,
                FocusSession.start_time >= today
            )
            focus_result = await self.db.execute(focus_query)
            focus_sessions = focus_result.scalars().all()
            
            # Calculate total focus time
            total_focus_minutes = sum(
                (fs.end_time - fs.start_time).total_seconds() / 60 
                for fs in focus_sessions 
                if fs.end_time
            )
            
            analysis = {
                "tasks_completed_today": len(completed_today),
                "focus_sessions_today": len(focus_sessions),
                "total_focus_minutes": int(total_focus_minutes),
                "productivity_score": self._calculate_productivity_score(
                    len(completed_today), 
                    total_focus_minutes
                )
            }
            
            message = f"Productivity Analysis:\n"
            message += f"- Tasks completed: {len(completed_today)}\n"
            message += f"- Focus time: {int(total_focus_minutes)} minutes\n"
            message += f"- Productivity score: {analysis['productivity_score']}/100\n"
            
            return ActionResult(
                success=True,
                message=message,
                data=analysis
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to analyze productivity: {str(e)}")
    
    async def _optimize_schedule(self, intent: Intent) -> ActionResult:
        """Optimize user's schedule"""
        try:
            # Get pending tasks
            task_query = select(Task).where(
                Task.user_id == self.user.id,
                Task.status == "pending"
            ).order_by(Task.due_date.asc())
            
            task_result = await self.db.execute(task_query)
            pending_tasks = task_result.scalars().all()
            
            # Generate schedule suggestions
            suggestions = self._generate_schedule_suggestions(pending_tasks)
            
            return ActionResult(
                success=True,
                message="Here are some schedule optimization suggestions:",
                data={"suggestions": suggestions}
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to optimize schedule: {str(e)}")
    
    async def _daily_summary(self, intent: Intent) -> ActionResult:
        """Generate daily summary"""
        try:
            today = datetime.utcnow().date()
            
            # Get today's completed tasks
            task_query = select(Task).where(
                Task.user_id == self.user.id,
                Task.completed_at >= today,
                Task.status == "completed"
            )
            task_result = await self.db.execute(task_query)
            completed_tasks = task_result.scalars().all()
            
            # Get today's focus sessions
            focus_query = select(FocusSession).where(
                FocusSession.user_id == self.user.id,
                FocusSession.start_time >= today
            )
            focus_result = await self.db.execute(focus_query)
            focus_sessions = focus_result.scalars().all()
            
            # Generate summary
            summary = self._generate_daily_summary(completed_tasks, focus_sessions)
            
            return ActionResult(
                success=True,
                message=f"Daily Summary for {today.strftime('%Y-%m-%d')}:\n{summary}",
                data={
                    "date": today.isoformat(),
                    "tasks_completed": len(completed_tasks),
                    "focus_sessions": len(focus_sessions)
                }
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to generate daily summary: {str(e)}")
    
    def _calculate_productivity_score(self, tasks_completed: int, focus_minutes: int) -> int:
        """Calculate productivity score"""
        # Simple scoring algorithm
        task_score = min(tasks_completed * 10, 50)  # Max 50 points from tasks
        focus_score = min(focus_minutes / 6, 50)  # Max 50 points from 5 hours focus
        
        return int(task_score + focus_score)
    
    def _generate_schedule_suggestions(self, pending_tasks) -> List[str]:
        """Generate schedule optimization suggestions"""
        suggestions = []
        
        if not pending_tasks:
            suggestions.append("No pending tasks - great job staying on top of things!")
            return suggestions
        
        # Prioritize urgent tasks
        urgent_tasks = [t for t in pending_tasks if t.priority == "high"]
        if urgent_tasks:
            suggestions.append(f"Focus on {len(urgent_tasks)} high-priority tasks first")
        
        # Suggest time blocking
        if len(pending_tasks) > 3:
            suggestions.append("Consider time-blocking your day for better focus")
        
        # Suggest breaks
        suggestions.append("Take regular breaks using the Pomodoro technique (25 min work, 5 min break)")
        
        # Suggest deep work
        suggestions.append("Schedule deep work sessions for complex tasks")
        
        return suggestions
    
    def _generate_daily_summary(self, completed_tasks, focus_sessions) -> str:
        """Generate daily summary text"""
        summary = f"\n✅ Completed {len(completed_tasks)} tasks:\n"
        for task in completed_tasks:
            summary += f"   - {task.title}\n"
        
        summary += f"\n⏱️ Focus sessions: {len(focus_sessions)}\n"
        
        if completed_tasks:
            summary += f"\n🎉 Great progress today! Keep up the momentum."
        else:
            summary += f"\n💪 No tasks completed yet today. Let's get started!"
        
        return summary
