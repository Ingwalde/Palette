import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .config import settings
from .database import SessionLocal, run_migrations
from .rate_limit import limiter
from .routers import auth, favorites, palettes
from .seed import seed_default_admin_user, seed_default_palettes

# Configure application logging once at import so every module's getLogger(...) shares a
# consistent format and level (overridable with the LOG_LEVEL env var).
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()

    db = SessionLocal()
    try:
        seed_default_palettes(db)
        seed_default_admin_user(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title="Palette API",
    description="Backend API for Palette v4.3 with auth, favorites, PostgreSQL and Docker.",
    version="4.3.0",
    docs_url="/api/docs" if settings.enable_api_docs else None,
    redoc_url="/api/redoc" if settings.enable_api_docs else None,
    openapi_url="/api/openapi.json" if settings.enable_api_docs else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(palettes.router, prefix="/api")
app.include_router(favorites.router, prefix="/api")


@app.get("/")
def root():
    return {
        "name": "Palette API",
        "version": "4.3.0",
        "docs": "/api/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
