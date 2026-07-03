from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.intent_system.action_executor import BaseAction, ActionResult
from app.core.intent_system.intent_classifier import Intent, IntentType
from app.models.core_models import User
from app.models.productivity_models import Task, Habit, HabitLog
from datetime import datetime, timedelta
import uuid


class TaskActions(BaseAction):
    """Actions related to tasks and productivity"""
    
    def can_handle(self, intent_type: IntentType) -> bool:
        return intent_type in [
            IntentType.CREATE_TASK,
            IntentType.UPDATE_TASK,
            IntentType.COMPLETE_TASK,
            IntentType.LIST_TASKS,
            IntentType.CREATE_PLAN,
            IntentType.GENERATE_SCHEDULE
        ]
    
    async def execute(self, intent: Intent) -> ActionResult:
        if intent.intent_type == IntentType.CREATE_TASK:
            return await self._create_task(intent)
        elif intent.intent_type == IntentType.UPDATE_TASK:
            return await self._update_task(intent)
        elif intent.intent_type == IntentType.COMPLETE_TASK:
            return await self._complete_task(intent)
        elif intent.intent_type == IntentType.LIST_TASKS:
            return await self._list_tasks(intent)
        elif intent.intent_type == IntentType.CREATE_PLAN:
            return await self._create_plan(intent)
        elif intent.intent_type == IntentType.GENERATE_SCHEDULE:
            return await self._generate_schedule(intent)
        
        return ActionResult(success=False, message="Unknown task action")
    
    async def _create_task(self, intent: Intent) -> ActionResult:
        """Create a task from user input"""
        try:
            # Extract task details from intent
            title = self._extract_task_title(intent)
            due_date = self._extract_due_date(intent.entities)
            priority = self._extract_priority(intent.raw_text)
            
            task = Task(
                id=uuid.uuid4(),
                user_id=self.user.id,
                title=title,
                description=intent.raw_text,
                due_date=due_date,
                priority=priority,
                status="pending",
                metadata=intent.entities
            )
            self.db.add(task)
            await self.db.commit()
            
            return ActionResult(
                success=True,
                message=f"Task created: {title}",
                data={"task_id": str(task.id), "due_date": due_date.isoformat() if due_date else None}
            )
        except Exception as e:
            await self.db.rollback()
            return ActionResult(success=False, message=f"Failed to create task: {str(e)}")
    
    async def _update_task(self, intent: Intent) -> ActionResult:
        """Update an existing task"""
        try:
            # Find the most recent pending task
            query = select(Task).where(
                Task.user_id == self.user.id,
                Task.status == "pending"
            ).order_by(Task.created_at.desc()).limit(1)
            
            result = await self.db.execute(query)
            task = result.scalar_one_or_none()
            
            if not task:
                return ActionResult(success=False, message="No pending task found to update")
            
            # Update task based on intent
            task.description = intent.raw_text
            task.updated_at = datetime.utcnow()
            
            await self.db.commit()
            
            return ActionResult(
                success=True,
                message=f"Task updated: {task.title}",
                data={"task_id": str(task.id)}
            )
        except Exception as e:
            await self.db.rollback()
            return ActionResult(success=False, message=f"Failed to update task: {str(e)}")
    
    async def _complete_task(self, intent: Intent) -> ActionResult:
        """Complete a task and update related habits"""
        try:
            topic = intent.entities.get("topic")
            task_type = intent.entities.get("type")
            
            # Find matching tasks
            query = select(Task).where(
                Task.user_id == self.user.id,
                Task.status == "pending"
            )
            
            if topic:
                query = query.where(Task.title.ilike(f"%{topic}%"))
            elif task_type:
                query = query.where(Task.title.ilike(f"%{task_type}%"))
            
            result = await self.db.execute(query)
            task = result.scalar_one_or_none()
            
            if task:
                task.status = "completed"
                task.completed_at = datetime.utcnow()
                task.updated_at = datetime.utcnow()
            
            # Update habit if applicable
            if topic or task_type:
                await self._update_study_habit(topic or task_type)
            
            await self.db.commit()
            
            if task:
                return ActionResult(
                    success=True,
                    message=f"Great job! Task completed: {task.title}",
                    data={"task_id": str(task.id)},
                    follow_up_actions=["generate_daily_summary"]
                )
            else:
                return ActionResult(
                    success=True,
                    message="No matching task found, but I've noted your progress.",
                    follow_up_actions=["generate_daily_summary"]
                )
        except Exception as e:
            await self.db.rollback()
            return ActionResult(success=False, message=f"Failed to complete task: {str(e)}")
    
    async def _list_tasks(self, intent: Intent) -> ActionResult:
        """List user's tasks"""
        try:
            query = select(Task).where(
                Task.user_id == self.user.id,
                Task.status == "pending"
            ).order_by(Task.due_date.asc())
            
            result = await self.db.execute(query)
            tasks = result.scalars().all()
            
            if not tasks:
                return ActionResult(success=True, message="You have no pending tasks!")
            
            task_list = [f"- {t.title} (due: {t.due_date.strftime('%Y-%m-%d') if t.due_date else 'no date'})" for t in tasks]
            
            return ActionResult(
                success=True,
                message=f"You have {len(tasks)} pending tasks:",
                data={"tasks": task_list}
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to list tasks: {str(e)}")
    
    async def _create_plan(self, intent: Intent) -> ActionResult:
        """Create a plan (generates tasks)"""
        # For now, delegate to schedule generation
        return await self._generate_schedule(intent)
    
    async def _generate_schedule(self, intent: Intent) -> ActionResult:
        """Generate a schedule based on user input"""
        try:
            # Simple schedule generation for now
            # In future, this would use the decision engine
            days = intent.entities.get("next_week", 7)
            
            return ActionResult(
                success=True,
                message=f"I'll help you plan for the next {days} days. Let me check your current tasks and deadlines...",
                data={"days": days},
                follow_up_actions=["analyze_current_situation"]
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to generate schedule: {str(e)}")
    
    async def _update_study_habit(self, topic: Optional[str]):
        """Update study habit when task is completed"""
        try:
            if not topic:
                return
            
            # Find or create habit for this topic
            query = select(Habit).where(
                Habit.user_id == self.user.id,
                Habit.name.ilike(f"%{topic}%")
            )
            
            result = await self.db.execute(query)
            habit = result.scalar_one_or_none()
            
            today = datetime.utcnow().date()
            
            if habit:
                # Log today's habit completion
                log_query = select(HabitLog).where(
                    HabitLog.habit_id == habit.id,
                    HabitLog.date == today
                )
                log_result = await self.db.execute(log_query)
                log = log_result.scalar_one_or_none()
                
                if not log:
                    log = HabitLog(
                        id=uuid.uuid4(),
                        habit_id=habit.id,
                        date=today,
                        completed=True
                    )
                    self.db.add(log)
                    habit.streak += 1
            else:
                # Create new habit
                habit = Habit(
                    id=uuid.uuid4(),
                    user_id=self.user.id,
                    name=f"Study {topic}",
                    description=f"Daily {topic} practice",
                    frequency="daily",
                    streak=1,
                    is_active=True
                )
                self.db.add(habit)
                
                # Create initial log
                log = HabitLog(
                    id=uuid.uuid4(),
                    habit_id=habit.id,
                    date=today,
                    completed=True
                )
                self.db.add(log)
        except Exception:
            pass  # Don't fail if habit update fails
    
    def _extract_task_title(self, intent: Intent) -> str:
        """Extract task title from intent"""
        text = intent.raw_text
        
        # Remove common phrases
        phrases_to_remove = [
            "i need to", "i have to", "remind me to", 
            "don't forget to", "add task", "create task"
        ]
        
        for phrase in phrases_to_remove:
            text = text.lower().replace(phrase, "")
        
        # Capitalize first letter
        return text.strip().capitalize()
    
    def _extract_due_date(self, entities: dict) -> Optional[datetime]:
        """Extract due date from entities"""
        now = datetime.utcnow()
        
        if entities.get("tomorrow"):
            return now + timedelta(days=1)
        elif entities.get("today"):
            return now + timedelta(hours=24)
        elif entities.get("next_week"):
            return now + timedelta(weeks=1)
        
        return None
    
    def _extract_priority(self, text: str) -> str:
        """Extract priority from text"""
        text_lower = text.lower()
        
        if "urgent" in text_lower or "asap" in text_lower:
            return "high"
        elif "important" in text_lower:
            return "medium"
        
        return "low"
