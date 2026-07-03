import time
from typing import Any, Callable, Optional


class RetryManager:
    def __init__(self, max_retries: int = 3, base_delay: float = 0.0) -> None:
        self.max_retries = max_retries
        self.base_delay = base_delay

    def run_with_retry(self, action: Callable[[], Any], *, max_retries: Optional[int] = None) -> Any:
        retries = max_retries if max_retries is not None else self.max_retries
        last_error: Optional[Exception] = None
        for attempt in range(retries + 1):
            try:
                return action()
            except Exception as exc:  # pragma: no cover - exercising retry behavior
                last_error = exc
                if attempt >= retries:
                    raise
                time.sleep(self.base_delay)
        if last_error is not None:
            raise last_error
        raise RuntimeError("retry action failed")
