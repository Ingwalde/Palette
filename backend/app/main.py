import logging
from contextlib import asynccontextmanager
from http import HTTPStatus

from fastapi import FastAPI
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import settings
from .database import AsyncSessionLocal, run_migrations
from .rate_limit import limiter
from .routers import auth, favorites, palettes, tags
from .seed import seed_default_admin_user, seed_default_palettes, seed_default_tags

# Configure application logging once at import so every module's getLogger(...) shares a
# consistent format and level (overridable with the LOG_LEVEL env var).
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
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
    description="Backend API for Palette v4.4.4 with auth, favorites, PostgreSQL and Docker.",
    version="4.4.4",
    docs_url="/api/docs" if settings.enable_api_docs else None,
    redoc_url="/api/redoc" if settings.enable_api_docs else None,
    openapi_url="/api/openapi.json" if settings.enable_api_docs else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
app.add_middleware(SlowAPIMiddleware)

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
        "version": "4.4.4",
        "docs": "/api/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
