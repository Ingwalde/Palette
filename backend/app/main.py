from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine, run_startup_migrations
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
    description="Backend API for Palette v3.1 with authentication and user-based favorites.",
    version="3.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        "version": "3.1.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
