import hmac
import logging
from contextlib import asynccontextmanager
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .database import AsyncSessionLocal, run_migrations
from .rate_limit import limiter
from .routers import auth, favorites, palettes, tags
from .security import ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE
from .seed import seed_default_admin_user, seed_default_palettes, seed_default_tags

# Mutating requests must echo the csrf_token cookie in the X-CSRF-Token header (double-submit
# CSRF). The auth-bootstrap endpoints run before a session/csrf cookie exists, so they are exempt.
_CSRF_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS", "TRACE"})
_CSRF_EXEMPT_PATHS = frozenset(
    {
        "/api/v1/auth/login",
        "/api/v1/auth/register",
        "/api/v1/auth/resend-verification",
        "/api/v1/auth/forgot-password",
        "/api/v1/auth/reset-password",
    }
)

# Configure application logging once at import so every module's getLogger(...) shares a
# consistent format and level (overridable with the LOG_LEVEL env var).
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)

# Error tracking. No-op unless SENTRY_DSN is configured; the FastAPI/ASGI integration is
# auto-enabled by sentry-sdk[fastapi], so unhandled errors are reported with request context.
if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.sentry_environment,
        traces_sample_rate=settings.sentry_traces_sample_rate,
        send_default_pii=False,
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()

    async with AsyncSessionLocal() as db:
        await seed_default_palettes(db)
        await seed_default_tags(db)
        await seed_default_admin_user(db)

    yield


app = FastAPI(
    title="Palette API",
    description="Backend API for Palette v4.6.0 with auth, favorites, PostgreSQL and Docker.",
    version="4.6.0",
    docs_url="/api/docs" if settings.enable_api_docs else None,
    redoc_url="/api/redoc" if settings.enable_api_docs else None,
    openapi_url="/api/openapi.json" if settings.enable_api_docs else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
app.add_middleware(SlowAPIMiddleware)


@app.middleware("http")
async def csrf_protect(request: Request, call_next):
    mutating = request.method not in _CSRF_SAFE_METHODS
    exempt = request.url.path in _CSRF_EXEMPT_PATHS
    # Only cookie-authenticated requests are at CSRF risk; without an auth cookie the request
    # carries no ambient credentials, so let it fall through to the endpoint's own auth check.
    authenticated = bool(request.cookies.get(ACCESS_COOKIE) or request.cookies.get(REFRESH_COOKIE))

    if mutating and not exempt and authenticated:
        cookie_token = request.cookies.get(CSRF_COOKIE)
        header_token = request.headers.get("X-CSRF-Token")
        if (
            not cookie_token
            or not header_token
            or not hmac.compare_digest(cookie_token, header_token)
        ):
            return _problem(
                HTTPStatus.FORBIDDEN, "CSRF token missing or invalid", title="Forbidden"
            )

    return await call_next(request)


# CORS is added last so it is the outermost middleware — it must wrap the CSRF check so even a
# 403 carries the CORS headers the browser needs to expose the response.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(palettes.router, prefix="/api/v1")
app.include_router(favorites.router, prefix="/api/v1")
app.include_router(tags.router, prefix="/api/v1")


def _problem(status_code: int, detail, title: str | None = None) -> JSONResponse:
    # RFC 7807 problem+json. Keeps `detail` so existing clients keep working.
    return JSONResponse(
        status_code=status_code,
        media_type="application/problem+json",
        content={
            "type": "about:blank",
            "title": title or HTTPStatus(status_code).phrase,
            "status": status_code,
            "detail": jsonable_encoder(detail),
        },
    )


@app.exception_handler(StarletteHTTPException)
def _http_exception_handler(request, exc: StarletteHTTPException) -> JSONResponse:
    response = _problem(exc.status_code, exc.detail)
    if exc.headers:  # preserve e.g. WWW-Authenticate on 401
        response.headers.update(exc.headers)
    return response


@app.exception_handler(RequestValidationError)
def _validation_exception_handler(request, exc: RequestValidationError) -> JSONResponse:
    return _problem(HTTPStatus.UNPROCESSABLE_ENTITY, exc.errors(), title="Validation Error")


@app.get("/")
def root():
    return {
        "name": "Palette API",
        "version": "4.6.0",
        "docs": "/api/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    # Liveness: the process is up and serving.
    return {"status": "ok"}


@app.get("/health/ready")
async def readiness_check():
    # Readiness: dependencies (database, and Redis when configured) are reachable.
    checks: dict[str, str] = {}
    ready = True

    try:
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
        ready = False

    if settings.redis_url.startswith("redis"):
        try:
            import redis.asyncio as redis_asyncio

            client = redis_asyncio.from_url(settings.redis_url)
            await client.ping()
            await client.aclose()
            checks["redis"] = "ok"
        except Exception:
            checks["redis"] = "error"
            ready = False

    if not ready:
        return JSONResponse(status_code=503, content={"status": "not ready", "checks": checks})
    return {"status": "ready", "checks": checks}
