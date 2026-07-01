from enum import Enum
from typing import Optional, List, Any, Dict
from uuid import UUID
from datetime import datetime, date
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Task Schemas
# ---------------------------------------------------------------------------
class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    priority: int = Field(default=3, ge=1, le=5)
    due_date: Optional[datetime] = None
    tags: List[str] = []
    parent_task_id: Optional[UUID] = None
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    estimated_minutes: Optional[int] = Field(None, ge=1)
    source: str = "manual"


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    priority: Optional[int] = Field(None, ge=1, le=5)
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    tags: Optional[List[str]] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None


class TaskRead(BaseModel):
    id: UUID
    user_id: UUID
    parent_task_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    priority: int
    status: str
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    tags: List[str] = []
    is_recurring: bool
    recurrence_rule: Optional[str] = None
    estimated_minutes: Optional[int] = None
    actual_minutes: Optional[int] = None
    source: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Habit Schemas
# ---------------------------------------------------------------------------
class HabitCategory(str, Enum):
    CODING = "coding"
    STUDY = "study"
    GYM = "gym"
    SLEEP = "sleep"
    READING = "reading"
    PROJECTS = "projects"
    LEETCODE = "leetcode"
    CUSTOM = "custom"


class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: HabitCategory
    frequency: str = "daily"
    target_count: int = Field(default=1, ge=1)
    unit: str = "times"
    color: str = "#6366f1"
    icon: str = "⭐"


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[HabitCategory] = None
    frequency: Optional[str] = None
    target_count: Optional[int] = Field(None, ge=1)
    unit: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


class HabitRead(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    description: Optional[str] = None
    category: str
    frequency: str
    target_count: int
    unit: str
    color: str
    icon: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class HabitLogCreate(BaseModel):
    date: date
    completed: bool = True
    count: int = Field(default=1, ge=0)
    notes: Optional[str] = None


class HabitLogRead(BaseModel):
    id: UUID
    habit_id: UUID
    user_id: UUID
    date: date
    completed: bool
    count: int
    notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class HabitAnalytics(BaseModel):
    habit_id: UUID
    habit_name: str
    total_logs: int
    completed_days: int
    streak_current: int
    streak_longest: int
    completion_rate: float
    weekly_data: List[Dict[str, Any]] = []


# ---------------------------------------------------------------------------
# Goal Schemas
# ---------------------------------------------------------------------------
class GoalCategory(str, Enum):
    SEMESTER = "semester"
    PLACEMENT = "placement"
    LEARNING = "learning"
    PROJECTS = "projects"
    HABITS = "habits"
    CUSTOM = "custom"


class GoalStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    PAUSED = "paused"
    ABANDONED = "abandoned"


class GoalCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    category: GoalCategory
    target_date: Optional[datetime] = None
    milestones: List[Dict[str, Any]] = []
    success_criteria: Optional[str] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[GoalCategory] = None
    target_date: Optional[datetime] = None
    progress_percent: Optional[float] = Field(None, ge=0.0, le=100.0)
    status: Optional[GoalStatus] = None
    milestones: Optional[List[Dict[str, Any]]] = None
    success_criteria: Optional[str] = None


class GoalRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    description: Optional[str] = None
    category: str
    target_date: Optional[datetime] = None
    progress_percent: float
    status: str
    milestones: List[Dict[str, Any]] = []
    success_criteria: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Focus Session Schemas
# ---------------------------------------------------------------------------
class FocusSessionType(str, Enum):
    POMODORO = "pomodoro"
    SHORT_BREAK = "short_break"
    LONG_BREAK = "long_break"
    DEEP_WORK = "deep_work"


class FocusSessionCreate(BaseModel):
    task_id: Optional[UUID] = None
    session_type: FocusSessionType = FocusSessionType.POMODORO
    duration_minutes: int = Field(default=25, ge=1, le=240)
    started_at: datetime
    notes: Optional[str] = None


class FocusSessionEnd(BaseModel):
    is_completed: bool = True
    actual_minutes: Optional[int] = Field(None, ge=1)
    notes: Optional[str] = None


class FocusSessionRead(BaseModel):
    id: UUID
    user_id: UUID
    task_id: Optional[UUID] = None
    session_type: str
    duration_minutes: int
    actual_minutes: Optional[int] = None
    is_completed: bool
    notes: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FocusStats(BaseModel):
    total_sessions: int
    completed_sessions: int
    total_focus_minutes: int
    avg_session_minutes: float
    streak_days: int
    today_sessions: int
    today_minutes: int
    weekly_data: List[Dict[str, Any]] = []


# ---------------------------------------------------------------------------
# Reminder Schemas
# ---------------------------------------------------------------------------
class ReminderCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    body: Optional[str] = None
    remind_at: datetime
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None
    linked_task_id: Optional[UUID] = None


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    remind_at: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = None
    is_dismissed: Optional[bool] = None


class ReminderRead(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    body: Optional[str] = None
    remind_at: datetime
    is_recurring: bool
    recurrence_rule: Optional[str] = None
    is_sent: bool
    is_dismissed: bool
    linked_task_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Daily & Weekly Review Schemas
# ---------------------------------------------------------------------------
class DailyReviewCreate(BaseModel):
    date: date
    mood_score: Optional[int] = Field(None, ge=1, le=10)
    energy_score: Optional[int] = Field(None, ge=1, le=10)
    productivity_score: Optional[int] = Field(None, ge=1, le=10)
    wins: Optional[str] = None
    blockers: Optional[str] = None
    tomorrow_plan: Optional[str] = None


class DailyReviewRead(BaseModel):
    id: UUID
    user_id: UUID
    date: date
    completed_tasks: List[Any] = []
    pending_tasks: List[Any] = []
    habit_summary: Dict[str, Any] = {}
    mood_score: Optional[int] = None
    energy_score: Optional[int] = None
    productivity_score: Optional[int] = None
    wins: Optional[str] = None
    blockers: Optional[str] = None
    tomorrow_plan: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_suggestions: List[Any] = []
    created_at: datetime

    class Config:
        from_attributes = True


class WeeklyReviewRead(BaseModel):
    id: UUID
    user_id: UUID
    week_start: date
    week_end: date
    stats: Dict[str, Any] = {}
    highlights: Optional[str] = None
    insights: Optional[str] = None
    ai_recommendations: Optional[str] = None
    goal_progress: List[Any] = []
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Planner Schemas
# ---------------------------------------------------------------------------
class PlannerRequest(BaseModel):
    plan_type: str = Field(default="daily", pattern="^(daily|weekly|monthly)$")
    date: Optional[date] = None
    preferences: Dict[str, Any] = {}


class PlannerResponse(BaseModel):
    plan_type: str
    date: Optional[date] = None
    schedule: List[Dict[str, Any]]
    ai_notes: Optional[str] = None
    estimated_workload: Optional[str] = None
