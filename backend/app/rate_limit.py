import time
import threading
from collections import defaultdict, deque

from fastapi import HTTPException


class RateLimiter:
    """Sliding-window in-memory rate limiter keyed by user id.

    Note: state is per-process, so on serverless (Vercel) this only limits
    within a single warm instance. Good enough as a basic guard against
    accidental loops and casual abuse of the Gemini quota; move to a shared
    store (e.g. Redis/Upstash) if real enforcement is ever needed.
    """

    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and hits[0] <= now - self.window_seconds:
                hits.popleft()
            if len(hits) >= self.max_requests:
                raise HTTPException(
                    status_code=429,
                    detail="Too many requests, please slow down.",
                )
            hits.append(now)


capture_limiter = RateLimiter(max_requests=20, window_seconds=60)
import_limiter = RateLimiter(max_requests=3, window_seconds=300)
