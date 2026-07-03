from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return a timezone-aware UTC timestamp for consistent backend usage."""
    return datetime.now(timezone.utc)
