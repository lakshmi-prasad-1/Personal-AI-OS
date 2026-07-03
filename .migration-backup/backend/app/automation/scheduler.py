from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional


@dataclass
class ScheduledJob:
    name: str
    run_at: datetime
    recurrence: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None


class Scheduler:
    def __init__(self) -> None:
        self.jobs: List[ScheduledJob] = []

    def schedule_once(self, name: str, run_at: datetime, payload: Optional[Dict[str, Any]] = None) -> ScheduledJob:
        job = ScheduledJob(name=name, run_at=run_at, payload=payload)
        self.jobs.append(job)
        return job

    def schedule_daily(self, name: str, run_at: datetime, payload: Optional[Dict[str, Any]] = None) -> ScheduledJob:
        return self.schedule_once(name, run_at, payload=payload)

    def schedule_weekly(self, name: str, run_at: datetime, payload: Optional[Dict[str, Any]] = None) -> ScheduledJob:
        return self.schedule_once(name, run_at, payload=payload)

    def schedule_monthly(self, name: str, run_at: datetime, payload: Optional[Dict[str, Any]] = None) -> ScheduledJob:
        return self.schedule_once(name, run_at, payload=payload)

    def schedule_delayed(self, name: str, delay_seconds: int, payload: Optional[Dict[str, Any]] = None) -> ScheduledJob:
        return self.schedule_once(name, datetime.utcnow() + timedelta(seconds=delay_seconds), payload=payload)
