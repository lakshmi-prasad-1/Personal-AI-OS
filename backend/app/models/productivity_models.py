import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, func, Float, ForeignKey, Boolean, Integer, Text, Date
from sqlalchemy.dialects.postgresql import UUID, TEXT, JSONB
from sqlalchemy.orm import relationship
from app.models.base import Base


# ---------------------------------------------------------------------------
# Task Manager
# ---------------------------------------------------------------------------
class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False, index=True)
    description = Column(TEXT, nullable=True)
    priority = Column(Integer, default=3)          # 1 (urgent) to 5 (someday)
    status = Column(String, default="todo", index=True)  # todo, in_progress, done, cancelled
    due_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    tags = Column(JSONB, default=list)
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(String, nullable=True)  # RRULE string e.g. FREQ=DAILY;INTERVAL=1
    estimated_minutes = Column(Integer, nullable=True)
    actual_minutes = Column(Integer, nullable=True)
    source = Column(String, nullable=True)          # manual, voice, planner, ai
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    subtasks = relationship("Task", backref="parent_task", remote_side="Task.id")


# ---------------------------------------------------------------------------
# Habit Tracker
# ---------------------------------------------------------------------------
class Habit(Base):
    __tablename__ = "habits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(TEXT, nullable=True)
    category = Column(String, nullable=False, index=True)  # coding, study, gym, sleep, reading, projects, leetcode
    frequency = Column(String, default="daily")   # daily, weekly, custom
    target_count = Column(Integer, default=1)      # e.g. 1 session per day, 3x per week
    unit = Column(String, default="times")         # times, minutes, pages, problems
    color = Column(String, default="#6366f1")      # UI color
    icon = Column(String, default="⭐")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    habit_id = Column(UUID(as_uuid=True), ForeignKey("habits.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    completed = Column(Boolean, default=False)
    count = Column(Integer, default=0)
    notes = Column(TEXT, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    habit = relationship("Habit", back_populates="logs")


# ---------------------------------------------------------------------------
# Goal Tracker
# ---------------------------------------------------------------------------
class Goal(Base):
    __tablename__ = "goals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(TEXT, nullable=True)
    category = Column(String, nullable=False, index=True)  # semester, placement, learning, projects, habits
    target_date = Column(DateTime(timezone=True), nullable=True)
    progress_percent = Column(Float, default=0.0)
    status = Column(String, default="active", index=True)  # active, completed, paused, abandoned
    milestones = Column(JSONB, default=list)  # [{title, done, due_date}]
    success_criteria = Column(TEXT, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ---------------------------------------------------------------------------
# Focus Mode (Pomodoro)
# ---------------------------------------------------------------------------
class FocusSession(Base):
    __tablename__ = "focus_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    session_type = Column(String, default="pomodoro")  # pomodoro, short_break, long_break, deep_work
    duration_minutes = Column(Integer, nullable=False)  # Planned duration
    actual_minutes = Column(Integer, nullable=True)     # Actual duration (if interrupted)
    is_completed = Column(Boolean, default=False)
    notes = Column(TEXT, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ---------------------------------------------------------------------------
# Reminder Agent
# ---------------------------------------------------------------------------
class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    body = Column(TEXT, nullable=True)
    remind_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(String, nullable=True)
    is_sent = Column(Boolean, default=False, index=True)
    is_dismissed = Column(Boolean, default=False)
    # Future: location-based triggering
    location_data = Column(JSONB, nullable=True)  # {lat, lng, radius, trigger_on: "arrive|leave"}
    linked_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ---------------------------------------------------------------------------
# Daily & Weekly Reviews
# ---------------------------------------------------------------------------
class DailyReview(Base):
    __tablename__ = "daily_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False, index=True)
    completed_tasks = Column(JSONB, default=list)
    pending_tasks = Column(JSONB, default=list)
    habit_summary = Column(JSONB, default=dict)
    mood_score = Column(Integer, nullable=True)         # 1-10
    energy_score = Column(Integer, nullable=True)       # 1-10
    productivity_score = Column(Integer, nullable=True) # 1-10
    wins = Column(TEXT, nullable=True)
    blockers = Column(TEXT, nullable=True)
    tomorrow_plan = Column(TEXT, nullable=True)
    ai_summary = Column(TEXT, nullable=True)
    ai_suggestions = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WeeklyReview(Base):
    __tablename__ = "weekly_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    week_start = Column(Date, nullable=False, index=True)
    week_end = Column(Date, nullable=False)
    stats = Column(JSONB, default=dict)         # tasks_done, habits_hit, focus_hours, etc.
    highlights = Column(TEXT, nullable=True)
    insights = Column(TEXT, nullable=True)
    ai_recommendations = Column(TEXT, nullable=True)
    goal_progress = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
