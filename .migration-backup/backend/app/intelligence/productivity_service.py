"""Service layer for productivity OS workflows."""

from __future__ import annotations

from datetime import datetime, date, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.productivity_models import Task, Habit, HabitLog, Goal, FocusSession, Reminder, DailyReview, WeeklyReview
from app.schemas.productivity import TaskCreate, HabitCreate, GoalCreate, ReminderCreate, FocusSessionCreate


class ProductivityService:
    async def create_task(self, db: AsyncSession, user_id: UUID, task_in: TaskCreate) -> Task:
        task = Task(
            user_id=user_id,
            title=task_in.title,
            description=task_in.description,
            priority=task_in.priority,
            due_date=task_in.due_date,
            tags=task_in.tags or [],
            is_recurring=task_in.is_recurring,
            recurrence_rule=task_in.recurrence_rule,
            estimated_minutes=task_in.estimated_minutes,
            source=task_in.source,
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task

    async def list_tasks(self, db: AsyncSession, user_id: UUID) -> List[Task]:
        result = await db.execute(select(Task).where(Task.user_id == user_id).order_by(Task.priority.asc(), Task.due_date.asc()))
        return result.scalars().all()

    async def create_habit(self, db: AsyncSession, user_id: UUID, habit_in: HabitCreate) -> Habit:
        habit = Habit(user_id=user_id, **habit_in.model_dump(mode="json"))
        db.add(habit)
        await db.commit()
        await db.refresh(habit)
        return habit

    async def log_habit(self, db: AsyncSession, user_id: UUID, habit_id: UUID, payload: Dict[str, Any]) -> HabitLog:
        log = HabitLog(habit_id=habit_id, user_id=user_id, **payload)
        db.add(log)
        await db.commit()
        await db.refresh(log)
        return log

    async def create_goal(self, db: AsyncSession, user_id: UUID, goal_in: GoalCreate) -> Goal:
        goal = Goal(user_id=user_id, **goal_in.model_dump(mode="json"))
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        return goal

    async def create_focus_session(self, db: AsyncSession, user_id: UUID, session_in: FocusSessionCreate) -> FocusSession:
        session = FocusSession(user_id=user_id, **session_in.model_dump(mode="json"))
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    async def end_focus_session(self, db: AsyncSession, session_id: UUID, actual_minutes: Optional[int], notes: Optional[str], completed: bool) -> FocusSession:
        result = await db.execute(select(FocusSession).where(FocusSession.id == session_id))
        session = result.scalars().first()
        if not session:
            raise ValueError("Focus session not found")
        session.actual_minutes = actual_minutes
        session.is_completed = completed
        session.notes = notes
        session.ended_at = datetime.utcnow()
        await db.commit()
        await db.refresh(session)
        return session

    async def create_reminder(self, db: AsyncSession, user_id: UUID, reminder_in: ReminderCreate) -> Reminder:
        reminder = Reminder(user_id=user_id, **reminder_in.model_dump(mode="json"))
        db.add(reminder)
        await db.commit()
        await db.refresh(reminder)
        return reminder

    async def list_reminders(self, db: AsyncSession, user_id: UUID) -> List[Reminder]:
        result = await db.execute(select(Reminder).where(Reminder.user_id == user_id).order_by(Reminder.remind_at.asc()))
        return result.scalars().all()

    async def create_daily_review(self, db: AsyncSession, user_id: UUID, payload: Dict[str, Any]) -> DailyReview:
        review = DailyReview(user_id=user_id, **payload)
        db.add(review)
        await db.commit()
        await db.refresh(review)
        return review

    async def get_weekly_review(self, db: AsyncSession, user_id: UUID) -> WeeklyReview:
        result = await db.execute(select(WeeklyReview).where(WeeklyReview.user_id == user_id).order_by(WeeklyReview.week_start.desc()).limit(1))
        review = result.scalars().first()
        if review:
            return review
        week_start = date.today() - timedelta(days=date.today().weekday())
        review = WeeklyReview(user_id=user_id, week_start=week_start, week_end=week_start + timedelta(days=6))
        db.add(review)
        await db.commit()
        await db.refresh(review)
        return review


productivity_service = ProductivityService()
