from slowapi import Limiter
from slowapi.util import get_remote_address

from .config import settings

# Shared limiter instance used by main.py (wiring) and routers (decorators). Keyed by
# client IP; counters live in the configured storage (in-memory by default, Redis in
# production) so limits hold across worker processes / instances.
limiter = Limiter(key_func=get_remote_address, storage_uri=settings.redis_url)
