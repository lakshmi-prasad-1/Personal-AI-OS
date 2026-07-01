from datetime import date, datetime
from typing import Annotated, List
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.intelligence.goal_engine import GoalEngine
from app.intelligence.habit_engine import HabitEngine
from app.intelligence.planner_engine import PlannerEngine
from app.intelligence.productivity_service import productivity_service
from app.intelligence.reminder_engine import ReminderEngine
from app.models.core_models import User
from app.schemas.productivity import (
    DailyReviewCreate,
    DailyReviewRead,
    FocusSessionCreate,
    FocusSessionEnd,
    FocusSessionRead,
    GoalCreate,
    GoalRead,
    HabitCreate,
    HabitLogCreate,
    HabitLogRead,
    HabitRead,
    PlannerRequest,
    PlannerResponse,
    ReminderCreate,
    ReminderRead,
    TaskCreate,
    TaskRead,
    WeeklyReviewRead,
)

router = APIRouter()
planner_engine = PlannerEngine()
reminder_engine = ReminderEngine()
goal_engine = GoalEngine()
habit_engine = HabitEngine()


@router.post("/tasks", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(task_in: TaskCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await productivity_service.create_task(db, current_user.id, task_in)


@router.get("/tasks", response_model=List[TaskRead])
async def list_tasks(current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await productivity_service.list_tasks(db, current_user.id)


@router.post("/planner", response_model=PlannerResponse)
async def build_planner(request: PlannerRequest, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    tasks = await productivity_service.list_tasks(db, current_user.id)
    task_payload = [{"title": task.title, "priority": task.priority, "due_date": task.due_date, "status": task.status} for task in tasks]
    plan = planner_engine.build_plan(request.plan_type, request.date or date.today(), tasks=task_payload, preferences=request.preferences)
    return PlannerResponse(**plan)


@router.post("/daily-review", response_model=DailyReviewRead)
async def create_daily_review(review_in: DailyReviewCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    tasks = await productivity_service.list_tasks(db, current_user.id)
    completed_tasks = [task for task in tasks if task.status == "done"]
    pending_tasks = [task for task in tasks if task.status != "done"]
    summary = {
        "completed_count": len(completed_tasks),
        "pending_count": len(pending_tasks),
        "habit_summary": {},
        "tomorrow_plan": review_in.tomorrow_plan or "Prepare the next priority task before sleeping.",
    }
    review_payload = {
        "date": review_in.date,
        "completed_tasks": [task.title for task in completed_tasks],
        "pending_tasks": [task.title for task in pending_tasks],
        "habit_summary": summary["habit_summary"],
        "mood_score": review_in.mood_score,
        "energy_score": review_in.energy_score,
        "productivity_score": review_in.productivity_score,
        "wins": review_in.wins,
        "blockers": review_in.blockers,
        "tomorrow_plan": summary["tomorrow_plan"],
        "ai_summary": f"Completed {summary['completed_count']} tasks and left {summary['pending_count']} pending.",
        "ai_suggestions": ["Protect one deep-work block tomorrow."]
    }
    return await productivity_service.create_daily_review(db, current_user.id, review_payload)


@router.get("/weekly-review", response_model=WeeklyReviewRead)
async def get_weekly_review(current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await productivity_service.get_weekly_review(db, current_user.id)


@router.post("/habits", response_model=HabitRead, status_code=status.HTTP_201_CREATED)
async def create_habit(habit_in: HabitCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await productivity_service.create_habit(db, current_user.id, habit_in)


@router.post("/habits/{habit_id}/logs", response_model=HabitLogRead)
async def log_habit(habit_id: UUID, log_in: HabitLogCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await productivity_service.log_habit(db, current_user.id, habit_id, log_in.model_dump())


@router.post("/goals", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
async def create_goal(goal_in: GoalCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await productivity_service.create_goal(db, current_user.id, goal_in)


@router.post("/focus-sessions", response_model=FocusSessionRead, status_code=status.HTTP_201_CREATED)
async def create_focus_session(session_in: FocusSessionCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await productivity_service.create_focus_session(db, current_user.id, session_in)


@router.patch("/focus-sessions/{session_id}", response_model=FocusSessionRead)
async def end_focus_session(session_id: UUID, end_in: FocusSessionEnd, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await productivity_service.end_focus_session(db, session_id, end_in.actual_minutes, end_in.notes, end_in.is_completed)


@router.post("/reminders", response_model=ReminderRead, status_code=status.HTTP_201_CREATED)
async def create_reminder(reminder_in: ReminderCreate, current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    parsed = reminder_engine.parse(reminder_in.title)
    reminder_data = reminder_in.model_dump()
    reminder_data.update({
        "title": parsed["title"],
        "body": reminder_in.body or parsed["body"],
        "remind_at": reminder_in.remind_at or parsed["remind_at"],
        "is_recurring": reminder_in.is_recurring or parsed["is_recurring"],
        "recurrence_rule": reminder_in.recurrence_rule or parsed["recurrence_rule"],
    })
    return await productivity_service.create_reminder(db, current_user.id, ReminderCreate(**reminder_data))


@router.get("/reminders", response_model=List[ReminderRead])
async def list_reminders(current_user: Annotated[User, Depends(get_current_active_user)], db: AsyncSession = Depends(get_db)):
    return await productivity_service.list_reminders(db, current_user.id)
