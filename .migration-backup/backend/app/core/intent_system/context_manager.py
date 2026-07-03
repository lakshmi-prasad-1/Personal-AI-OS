from typing import Dict, Any, Optional, List
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.core_models import User, Memory
from app.models.productivity_models import Task, Goal, Habit


class UserContext(BaseModel):
    """Represents the current context of a user"""
    user_id: str
    current_focus: Optional[str] = None
    active_tasks: List[str] = []
    current_goals: List[str] = []
    recent_activities: List[Dict[str, Any]] = []
    time_context: Optional[str] = None  # morning, afternoon, evening, etc.
    study_context: Optional[str] = None  # exam_prep, project_work, learning, etc.
    career_context: Optional[str] = None  # job_search, interview_prep, etc.


class ContextManager:
    """Manages user context for intelligent decision making"""
    
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
        self.context: Optional[UserContext] = None
    
    async def build_context(self) -> UserContext:
        """Build comprehensive user context from database"""
        context = UserContext(user_id=str(self.user.id))
        
        # Get active tasks
        task_query = select(Task).where(
            Task.user_id == self.user.id,
            Task.status == "pending"
        ).order_by(Task.due_date.asc()).limit(5)
        
        task_result = await self.db.execute(task_query)
        active_tasks = task_result.scalars().all()
        context.active_tasks = [t.title for t in active_tasks]
        
        # Get active goals
        goal_query = select(Goal).where(
            Goal.user_id == self.user.id,
            Goal.is_active == True
        )
        
        goal_result = await self.db.execute(goal_query)
        active_goals = goal_result.scalars().all()
        context.current_goals = [g.title for g in active_goals]
        
        # Determine time context
        context.time_context = self._get_time_context()
        
        # Determine study context from tasks
        if active_tasks:
            context.study_context = self._infer_study_context(active_tasks)
        
        # Determine career context
        context.career_context = await self._infer_career_context()
        
        # Set current focus
        if active_tasks:
            context.current_focus = active_tasks[0].title
        
        self.context = context
        return context
    
    def _get_time_context(self) -> str:
        """Determine time context based on current hour"""
        hour = datetime.now().hour
        
        if 5 <= hour < 12:
            return "morning"
        elif 12 <= hour < 17:
            return "afternoon"
        elif 17 <= hour < 21:
            return "evening"
        else:
            return "night"
    
    def _infer_study_context(self, tasks: List[Task]) -> Optional[str]:
        """Infer study context from active tasks"""
        task_titles = " ".join([t.title.lower() for t in tasks])
        
        if "exam" in task_titles or "test" in task_titles:
            return "exam_prep"
        elif "project" in task_titles:
            return "project_work"
        elif "assignment" in task_titles:
            return "assignment_work"
        elif "learn" in task_titles or "study" in task_titles:
            return "learning"
        
        return None
    
    async def _infer_career_context(self) -> Optional[str]:
        """Infer career context from user data"""
        try:
            from app.models.career_models import Application
            
            # Check for recent applications
            app_query = select(Application).where(
                Application.user_id == self.user.id
            ).order_by(Application.created_at.desc()).limit(5)
            
            app_result = await self.db.execute(app_query)
            recent_apps = app_result.scalars().all()
            
            if recent_apps:
                return "job_search"
            
            # Check for interview prep
            from app.models.career_models import InterviewQuestion
            interview_query = select(InterviewQuestion).where(
                InterviewQuestion.user_id == self.user.id
            ).limit(1)
            
            interview_result = await self.db.execute(interview_query)
            if interview_result.scalar_one_or_none():
                return "interview_prep"
            
        except Exception:
            pass
        
        return None
    
    async def add_recent_activity(self, activity_type: str, description: str, metadata: Dict[str, Any] = None):
        """Add a recent activity to context"""
        if not self.context:
            await self.build_context()
        
        activity = {
            "type": activity_type,
            "description": description,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }
        
        self.context.recent_activities.append(activity)
        
        # Keep only last 10 activities
        if len(self.context.recent_activities) > 10:
            self.context.recent_activities = self.context.recent_activities[-10:]
    
    async def get_contextual_suggestions(self) -> List[str]:
        """Get suggestions based on current context"""
        if not self.context:
            await self.build_context()
        
        suggestions = []
        
        # Time-based suggestions
        if self.context.time_context == "morning":
            suggestions.append("Good morning! Ready to start your most important task?")
        elif self.context.time_context == "afternoon":
            suggestions.append("Afternoon check-in: How's your progress on today's tasks?")
        elif self.context.time_context == "evening":
            suggestions.append("Evening review: Would you like a summary of today's accomplishments?")
        
        # Context-based suggestions
        if self.context.study_context == "exam_prep":
            suggestions.append("Focus on exam preparation. Would you like me to create a study schedule?")
        elif self.context.study_context == "project_work":
            suggestions.append("Working on a project? Need help breaking it down into tasks?")
        
        # Task-based suggestions
        if len(self.context.active_tasks) > 3:
            suggestions.append(f"You have {len(self.context.active_tasks)} pending tasks. Want me to prioritize them?")
        
        return suggestions
    
    def get_context_summary(self) -> str:
        """Get a natural language summary of current context"""
        if not self.context:
            return "I'm still learning about your current situation."
        
        summary_parts = []
        
        if self.context.current_focus:
            summary_parts.append(f"Currently focused on: {self.context.current_focus}")
        
        if self.context.active_tasks:
            summary_parts.append(f"Active tasks: {len(self.context.active_tasks)}")
        
        if self.context.current_goals:
            summary_parts.append(f"Active goals: {len(self.context.current_goals)}")
        
        if self.context.time_context:
            summary_parts.append(f"Time: {self.context.time_context}")
        
        return ". ".join(summary_parts) + "."
