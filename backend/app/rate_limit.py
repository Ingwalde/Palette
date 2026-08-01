from slowapi import Limiter
from slowapi.util import get_remote_address

# Shared limiter instance used by main.py (wiring) and routers (decorators).
# Keyed by client IP address.
limiter = Limiter(key_func=get_remote_address)
