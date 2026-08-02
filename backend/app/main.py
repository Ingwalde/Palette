from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from .config import CORS_ORIGINS, ENABLE_API_DOCS
from .database import Base, SessionLocal, engine, run_startup_migrations
from .rate_limit import limiter
from .routers import auth, favorites, palettes
from .seed import seed_default_admin_user, seed_default_palettes


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_startup_migrations()

    db = SessionLocal()
    try:
        seed_default_palettes(db)
        seed_default_admin_user(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title="Palette API",
    description="Backend API for Palette v4.2 with authentication, user-based favorites, PostgreSQL, Docker and CI.",
    version="4.2.1",
    docs_url="/api/docs" if ENABLE_API_DOCS else None,
    redoc_url="/api/redoc" if ENABLE_API_DOCS else None,
    openapi_url="/api/openapi.json" if ENABLE_API_DOCS else None,
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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
        "version": "4.2.1",
        "docs": "/api/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
