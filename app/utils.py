from __future__ import annotations

from datetime import datetime
from typing import Any, Callable, Optional


def isoformat(dt: Optional[datetime]) -> Optional[str]:
    """Return an ISO 8601 string or None."""

    if not dt:
        return None
    return dt.isoformat()


def apply_updates(instance: Any, data: dict[str, Any], *, allowed: Optional[set[str]] = None) -> Any:
    """Update model attributes with a dict, optionally restricting to allowed keys."""

    keys = allowed if allowed is not None else set(data.keys())
    for key in keys:
        if key in data:
            setattr(instance, key, data[key])
    return instance


def ensure(condition: bool, error_factory: Callable[[], Exception]) -> None:
    """Raise the supplied error when the condition is false."""

    if not condition:
        raise error_factory()
