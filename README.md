# AI Brain OS

AI Brain OS is a modular assistant platform for memory, search, notes, resources, ideas, and chat. This repository now includes an upgraded intelligence layer with context assembly, decisions, recommendations, profile awareness, and a structured memory pipeline.

## Architecture
- Backend: FastAPI + SQLAlchemy + Async PG + pgvector
- Frontend: Next.js app router
- Intelligence: context engine, reasoning layer, decision engine, recommendation engine, memory classifier, entity extractor, timeline engine, memory linker

## Folder structure
- backend/app/api: API routers
- backend/app/core: config, database, security
- backend/app/intelligence: reasoning, memory, graph, search, extraction
- backend/app/models: ORM models
- backend/app/repositories: repository layer
- frontend/src/app: application pages
- frontend/src/components: shared UI components

## Development setup
1. Create and activate a Python virtual environment.
2. Install dependencies from backend/requirements.txt.
3. Copy .env.example to .env and update values.
4. Run the API with uvicorn app.main:app.
5. Run the frontend with npm install and npm run dev.

## Database
- Alembic migrations live under backend/alembic.
- The startup path uses migrations rather than create_all.

## Context pipeline
1. User input enters the reasoning layer.
2. Entities and memory classification are extracted.
3. Context is assembled from profile, memories, notes, resources, and graph data.
4. Decisions and recommendations are generated.
5. The response is produced with the assembled context.

## Deployment guide
- Provide a production Postgres URL and OpenAI credentials through environment variables.
- Configure CORS through FRONTEND_URL.
- Ensure pgvector and Postgres extensions are available.
