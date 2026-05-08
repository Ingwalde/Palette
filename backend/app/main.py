from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, SessionLocal, engine
from .routers import palettes
from .seed import seed_default_palettes


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        seed_default_palettes(db)
    finally:
        db.close()

    yield


app = FastAPI(
    title="Palette API",
    description="Backend API for Palette v3.0. Authentication is planned for v3.1.",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(palettes.router, prefix="/api")


@app.get("/")
def root():
    return {
        "name": "Palette API",
        "version": "3.0.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
