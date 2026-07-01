# AI Operating System

A comprehensive AI-powered personal assistant platform with long-term memory, semantic search, knowledge graphs, and specialized operating systems for productivity, career, study, and automation.

## Overview

AI Operating System is an intelligent personal assistant that combines multiple AI-powered modules into a unified platform. It features a sophisticated intelligence layer with context assembly, decision engines, and memory management, along with specialized modules for different aspects of personal and professional life.

## Features

### Core Intelligence
- **AI Brain**: Central intelligence hub with context-aware reasoning
- **Long-Term Memory**: Persistent memory with semantic search and classification
- **AI Chat**: Context-aware conversations with memory integration
- **Knowledge Graph**: Entity relationship mapping and visualization
- **Resource Vault**: Document management with AI-powered organization
- **Smart Notes**: Intelligent note-taking with auto-tagging
- **Semantic Search**: Vector-based search across all content

### Productivity OS
- **Planner**: AI-assisted task planning and scheduling
- **Reminder Agent**: Intelligent reminders with context awareness
- **Habit Tracker**: Track and analyze personal habits
- **Focus Mode**: Distraction-free work sessions with AI coaching

### Career OS
- **Resume AI**: AI-powered resume optimization
- **Job Matching**: Intelligent job recommendation system
- **Internship Tracker**: Track internship applications and opportunities
- **Career Coach**: AI guidance for career development

### Study OS
- **Flashcards**: AI-generated flashcards for learning
- **Quizzes**: Adaptive quiz generation
- **Spaced Repetition**: Optimized learning schedules
- **Learning Roadmaps**: Personalized learning paths
- **Weak Topic Analysis**: Identify and focus on weak areas

### Automation OS
- **Workflow Automation**: Automate repetitive tasks
- **Global Intelligence Layer**: Cross-module intelligence sharing
- **Decision Engine**: AI-powered decision support
- **Context Engine**: Intelligent context assembly
- **Memory Engine**: Advanced memory classification and linking

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │  Chat    │ │ Memories │ │  Notes   │ │ Resources│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Productivity│ │ Career  │ │  Study   │ │Automation│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (FastAPI)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    API Layer                          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Intelligence Layer                       │  │
│  │  Context Engine | Decision Engine | Memory Engine    │  │
│  │  Entity Extractor | Timeline Engine | Profile Engine │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Specialized OS Modules                    │  │
│  │  Productivity | Career | Study | Automation           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Repository Layer                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │    Redis     │  │   pgvector   │     │
│  │  + pgvector  │  │   (Cache)    │  │ (Embeddings) │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

**Backend**
- FastAPI - High-performance async web framework
- SQLAlchemy - ORM with async support
- PostgreSQL - Primary database
- pgvector - Vector embeddings for semantic search
- Redis - Caching and session management
- Celery - Background task processing
- OpenAI API - AI/LLM integration
- PyJWT - JWT authentication
- Alembic - Database migrations

**Frontend**
- Next.js 16 - React framework with App Router
- React 19 - UI library
- TypeScript - Type safety
- Tailwind CSS - Styling
- Lucide React - Icons

**Infrastructure**
- Docker - Containerization
- Docker Compose - Development orchestration
- Vercel - Frontend deployment
- Render/Railway/AWS/GCP/Azure - Backend deployment options

## Screenshots

*Add screenshots of the application here*

## Folder Structure

```
ai-brain-os/
├── backend/
│   ├── app/
│   │   ├── api/              # API routers and endpoints
│   │   │   ├── v1/           # API version 1
│   │   │   └── middleware/   # Custom middleware
│   │   ├── automation/       # Automation OS modules
│   │   ├── core/             # Configuration, database, security
│   │   ├── intelligence/     # AI intelligence layer
│   │   │   ├── brain/        # AI brain modules
│   │   │   ├── global_intelligence/
│   │   │   ├── graph/        # Knowledge graph
│   │   │   ├── memory/       # Memory management
│   │   │   ├── prompts/      # AI prompts
│   │   │   ├── rag/          # Retrieval augmented generation
│   │   │   └── voice/        # Voice processing
│   │   ├── models/           # Database models
│   │   ├── repositories/     # Data access layer
│   │   ├── schemas/          # Pydantic schemas
│   │   └── main.py           # Application entry point
│   ├── alembic/              # Database migrations
│   ├── tests/                # Test suite
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js app router pages
│   │   ├── components/       # Reusable components
│   │   ├── contexts/         # React contexts
│   │   └── lib/              # Utility functions
│   ├── public/               # Static assets
│   ├── package.json          # Node dependencies
│   ├── next.config.ts        # Next.js configuration
│   └── .env.local.example    # Environment variables template
├── docker-compose.yml        # Development Docker setup
├── docker-compose.production.yml  # Production Docker setup
├── .gitignore                # Git ignore rules
├── LICENSE                   # MIT License
├── README.md                 # This file
└── CONTRIBUTING.md           # Contribution guidelines
```

## Installation

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ with pgvector extension
- Redis 7+
- Docker (optional, for containerized setup)

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Unix/MacOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Required variables:
# - POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_SERVER, POSTGRES_DB
# - REDIS_HOST, REDIS_PORT
# - SECRET_KEY (generate a strong secret)
# - OPENAI_API_KEY (your OpenAI API key)
# - FRONTEND_URL (your frontend URL)

# Run database migrations
alembic upgrade head

# Start the backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Copy environment file
cp .env.local.example .env.local

# Edit .env.local with your configuration
# Required variables:
# - NEXT_PUBLIC_API_URL (your backend API URL)

# Start the development server
npm run dev
```

### Docker Setup

```bash
# Start PostgreSQL and Redis with Docker Compose
docker-compose up -d

# Follow Backend and Frontend setup above
# The database will be available at localhost:5432
# Redis will be available at localhost:6379
```

## Environment Variables

### Backend (.env)

```bash
# Database Configuration
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_secure_password
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DB=aibrain

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
SECRET_KEY=your_super_secret_key_generate_with_openssl
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_CHAT_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# File Upload
UPLOAD_MAX_SIZE_MB=10

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## Running Backend

```bash
cd backend
# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Development
uvicorn app.main:app --reload

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Running Frontend

```bash
cd frontend

# Development
npm run dev

# Production build
npm run build
npm start
```

## Docker

### Development

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Build and start production containers
docker-compose -f docker-compose.production.yml up -d

# View logs
docker-compose -f docker-compose.production.yml logs -f

# Stop services
docker-compose -f docker-compose.production.yml down
```

## Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
3. Add environment variables:
   - `NEXT_PUBLIC_API_URL`: Your deployed backend URL
4. Deploy

### Backend Options

**Render**
1. Connect GitHub repository
2. Select "Web Service"
3. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables from `.env.example`
5. Deploy

**Railway**
1. Connect GitHub repository
2. Add PostgreSQL and Redis services
3. Configure environment variables
4. Deploy

**AWS/GCP/Azure**
- Use provided Dockerfiles
- Configure container registry
- Set up managed PostgreSQL with pgvector
- Configure Redis
- Deploy containers

## API Documentation

Once the backend is running, access the interactive API documentation at:

- Swagger UI: `http://localhost:8000/api/v1/docs`
- ReDoc: `http://localhost:8000/api/v1/redoc`

### Main API Endpoints

- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/memory` - List memories
- `POST /api/v1/memory` - Create memory
- `GET /api/v1/chat` - Chat with AI
- `GET /api/v1/search` - Semantic search
- `GET /api/v1/productivity/tasks` - Productivity tasks
- `GET /api/v1/career/jobs` - Job matching
- `GET /api/v1/study/flashcards` - Study flashcards

## Future Roadmap

### v1.1.0
- [ ] Mobile applications (iOS/Android)
- [ ] Voice input/output improvements
- [ ] Enhanced knowledge graph visualization
- [ ] Integration with external services (Google Calendar, Notion, etc.)

### v1.2.0
- [ ] Multi-user support with team collaboration
- [ ] Advanced analytics and insights
- [ ] Custom AI model fine-tuning
- [ ] Plugin system for extensions

### v2.0.0
- [ ] Local AI model support (privacy-focused)
- [ ] Advanced automation workflows
- [ ] Real-time collaboration features
- [ ] Enterprise features and SSO

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Security

For security policies and vulnerability reporting, please see [SECURITY.md](SECURITY.md).

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Acknowledgments

- OpenAI for GPT models and embeddings
- The FastAPI community
- The Next.js team
- All contributors to this project
