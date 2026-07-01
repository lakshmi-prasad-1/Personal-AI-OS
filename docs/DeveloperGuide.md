# Developer Guide

This guide helps developers get started with contributing to AI Operating System.

## Table of Contents
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Adding New Features](#adding-new-features)
- [Debugging](#debugging)
- [Common Tasks](#common-tasks)

## Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ with pgvector
- Redis 7+
- Docker (optional)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Unix/MacOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Set up database connection, OpenAI API key, etc.

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Edit .env.local with your configuration
# Set NEXT_PUBLIC_API_URL

# Start development server
npm run dev
```

### Using Docker

```bash
# Start database services
docker-compose up -d

# Follow Backend and Frontend setup above
```

## Project Structure

### Backend Structure

```
backend/
├── app/
│   ├── api/              # API routers
│   │   ├── v1/          # API version 1 endpoints
│   │   └── middleware/  # Custom middleware
│   ├── automation/      # Automation OS modules
│   ├── core/            # Core configuration
│   ├── intelligence/    # AI intelligence layer
│   ├── models/          # Database models
│   ├── repositories/    # Data access layer
│   ├── schemas/         # Pydantic schemas
│   └── main.py          # Application entry point
├── alembic/             # Database migrations
├── scripts/             # Utility scripts
├── tests/               # Test suite
├── requirements.txt     # Python dependencies
└── .env.example         # Environment template
```

### Frontend Structure

```
frontend/
├── src/
│   ├── app/             # Next.js App Router pages
│   ├── components/      # Reusable components
│   ├── contexts/        # React contexts
│   └── lib/             # Utility functions
├── public/              # Static assets
├── package.json         # Node dependencies
└── next.config.ts       # Next.js configuration
```

## Coding Standards

### Python (Backend)

- Follow PEP 8 style guidelines
- Use type hints for function signatures
- Write docstrings for functions and classes
- Use async/await for I/O operations

#### Example

```python
from typing import Optional
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

async def get_memory(
    memory_id: str,
    session: AsyncSession = Depends(get_db)
) -> Optional[Memory]:
    """
    Retrieve a memory by ID.
    
    Args:
        memory_id: The UUID of the memory
        session: Database session
        
    Returns:
        Memory object if found, None otherwise
    """
    result = await session.execute(
        select(Memory).where(Memory.id == memory_id)
    )
    return result.scalar_one_or_none()
```

### TypeScript (Frontend)

- Follow existing code style
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use proper TypeScript types

#### Example

```typescript
interface Memory {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
}

const MemoryCard: React.FC<{ memory: Memory }> = ({ memory }) => {
  return (
    <div className="p-4 border rounded">
      <p>{memory.content}</p>
      <div className="flex gap-2">
        {memory.tags.map(tag => (
          <span key={tag} className="text-sm text-gray-600">
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};
```

### Git Commit Messages

Use conventional commit format:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `refactor:` for code refactoring
- `test:` for test additions/changes
- `chore:` for maintenance tasks

#### Examples

```bash
git commit -m "feat: add flashcard generation endpoint"
git commit -m "fix: resolve memory search pagination issue"
git commit -m "docs: update API documentation"
```

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run specific test file
pytest tests/test_memory.py

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_memory.py::test_create_memory
```

### Frontend Tests

```bash
cd frontend

# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

### Writing Tests

#### Backend Test Example

```python
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_create_memory():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/memory",
            json={"content": "Test memory"},
            headers={"Authorization": "Bearer test_token"}
        )
    assert response.status_code == 201
    assert response.json()["content"] == "Test memory"
```

## Adding New Features

### Adding a New API Endpoint

1. **Create Pydantic Schema** (`app/schemas/`)

```python
from pydantic import BaseModel
from typing import Optional

class FeatureCreate(BaseModel):
    name: str
    description: Optional[str] = None

class FeatureResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
```

2. **Create Repository Method** (`app/repositories/`)

```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def create_feature(
    session: AsyncSession,
    feature_data: FeatureCreate
) -> Feature:
    feature = Feature(**feature_data.dict())
    session.add(feature)
    await session.commit()
    await session.refresh(feature)
    return feature
```

3. **Create API Router** (`app/api/v1/`)

```python
from fastapi import APIRouter, Depends
from app.schemas.feature import FeatureCreate, FeatureResponse
from app.repositories.feature import create_feature

router = APIRouter()

@router.post("/", response_model=FeatureResponse)
async def create_new_feature(
    feature: FeatureCreate,
    session: AsyncSession = Depends(get_db)
):
    return await create_feature(session, feature)
```

4. **Register Router** (`app/main.py`)

```python
from app.api.v1 import feature

app.include_router(feature.router, prefix="/api/v1/feature", tags=["feature"])
```

5. **Add Tests** (`tests/`)

```python
@pytest.mark.asyncio
async def test_create_feature():
    # Test implementation
    pass
```

### Adding a New Frontend Page

1. **Create Page Component** (`src/app/feature/`)

```typescript
// src/app/feature/page.tsx
'use client';

import { useState } from 'react';

export default function FeaturePage() {
  const [data, setData] = useState(null);

  return (
    <div className="container mx-auto p-4">
      <h1>Feature Page</h1>
      {/* Page content */}
    </div>
  );
}
```

2. **Add Navigation** (if needed)

```typescript
// Update navigation component
<Link href="/feature">Feature</Link>
```

## Debugging

### Backend Debugging

```bash
# Enable debug logging
export DEBUG=True

# Run with debugger
python -m pdb app/main.py

# Use VS Code debugger
# Create .vscode/launch.json
```

### Frontend Debugging

```bash
# Run with debug
npm run dev

# Use browser DevTools
# React DevTools extension
```

### Database Debugging

```bash
# Connect to database
psql -U admin -d aibrain

# View queries
# Enable query logging in config
```

## Common Tasks

### Adding a New Database Model

1. **Create Model** (`app/models/`)

```python
from sqlalchemy import Column, String, DateTime
from app.models.base import Base
import uuid

class NewModel(Base):
    __tablename__ = "new_models"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
```

2. **Import in Models Init** (`app/models/__init__.py`)

```python
from app.models.new_model import NewModel
```

3. **Create Migration**

```bash
alembic revision --autogenerate -m "Add new model"
alembic upgrade head
```

### Adding Environment Variables

1. **Update Config** (`app/core/config.py`)

```python
class Settings(BaseSettings):
    NEW_VARIABLE: str = "default_value"
```

2. **Update .env.example**

```bash
NEW_VARIABLE=your_value
```

### Adding a New Intelligence Module

1. **Create Module** (`app/intelligence/`)

```python
from typing import List

class NewIntelligenceModule:
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    async def process(self, input_data: str) -> str:
        # Implementation
        return result
```

2. **Integrate with Context Engine**

```python
# Update context_engine.py to use new module
```

3. **Add Tests**

```python
# Create test file
```

## Performance Optimization

### Backend Optimization

- Use async/await for I/O operations
- Implement caching with Redis
- Optimize database queries with indexes
- Use connection pooling
- Enable query result caching

### Frontend Optimization

- Use React.memo for expensive components
- Implement code splitting with dynamic imports
- Optimize images and assets
- Use proper state management
- Implement virtual scrolling for long lists

## Security Best Practices

### Backend

- Never hardcode secrets
- Use environment variables
- Implement proper authentication
- Validate all inputs
- Use parameterized queries
- Enable CORS properly
- Implement rate limiting

### Frontend

- Never store secrets in environment variables
- Use HTTPS in production
- Validate user inputs
- Sanitize user-generated content
- Implement proper error handling

## Deployment

### Backend Deployment

See [Deployment.md](Deployment.md) for detailed deployment instructions.

### Frontend Deployment

See [Deployment.md](Deployment.md) for detailed deployment instructions.

## Resources

### Documentation

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)

### Tools

- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)
- [Docker](https://www.docker.com/)
- [Git](https://git-scm.com/)

## Getting Help

- Open an issue on GitHub
- Check existing documentation
- Review similar code in the codebase
- Ask questions in discussions

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.
