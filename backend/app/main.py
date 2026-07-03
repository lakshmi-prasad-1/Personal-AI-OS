from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.models.base import Base
from app.models import core_models, productivity_models, career_models, automation_models
from app.api.v1 import (
    health, auth, users, memory, resources, chat, notes, ideas,
    search, graph, voice, productivity, career, automation, brain, profile, study, global_intelligence,
)
from app.api.middleware.telemetry import TelemetryMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    if engine is not None:
        async with engine.begin() as conn:
            # Only run PostgreSQL extensions if using PostgreSQL
            if "postgresql" in str(engine.url):
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
            await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(TelemetryMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix=f"{settings.API_V1_STR}", tags=["health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["auth"])
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(profile.router, prefix=f"{settings.API_V1_STR}/profile", tags=["profile"])
app.include_router(brain.router, prefix=f"{settings.API_V1_STR}/brain", tags=["brain"])
app.include_router(memory.router, prefix=f"{settings.API_V1_STR}/memory", tags=["memory"])
app.include_router(resources.router, prefix=f"{settings.API_V1_STR}/resources", tags=["resources"])
app.include_router(chat.router, prefix=f"{settings.API_V1_STR}/chat", tags=["chat"])
app.include_router(notes.router, prefix=f"{settings.API_V1_STR}/notes", tags=["notes"])
app.include_router(ideas.router, prefix=f"{settings.API_V1_STR}/ideas", tags=["ideas"])
app.include_router(search.router, prefix=f"{settings.API_V1_STR}/search", tags=["search"])
app.include_router(graph.router, prefix=f"{settings.API_V1_STR}/graph", tags=["graph"])
app.include_router(voice.router, prefix=f"{settings.API_V1_STR}/voice", tags=["voice"])
app.include_router(productivity.router, prefix=f"{settings.API_V1_STR}/productivity", tags=["productivity"])
app.include_router(career.router, prefix=f"{settings.API_V1_STR}/career", tags=["career"])
app.include_router(study.router, prefix=f"{settings.API_V1_STR}/study", tags=["study"])
app.include_router(global_intelligence.router, prefix=f"{settings.API_V1_STR}/global-intelligence", tags=["global-intelligence"])
app.include_router(automation.router, prefix=f"{settings.API_V1_STR}/automation", tags=["automation"])


@app.get("/")
async def root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API", "version": "2.0"}
