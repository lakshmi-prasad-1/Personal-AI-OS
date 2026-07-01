# Architecture Documentation

## System Overview

AI Operating System is a comprehensive AI-powered personal assistant platform built with a microservices-inspired architecture. The system consists of a FastAPI backend, Next.js frontend, and intelligent AI modules for various personal productivity tasks.

## High-Level Architecture

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
│  │  - Authentication & Authorization                   │  │
│  │  - Request Validation                                │  │
│  │  - Response Formatting                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Intelligence Layer                       │  │
│  │  - Context Engine                                     │  │
│  │  - Decision Engine                                    │  │
│  │  - Memory Engine                                      │  │
│  │  - Entity Extractor                                   │  │
│  │  - Timeline Engine                                    │  │
│  │  - Profile Engine                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Specialized OS Modules                    │  │
│  │  - Productivity OS                                    │  │
│  │  - Career OS                                          │  │
│  │  - Study OS                                           │  │
│  │  - Automation OS                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Repository Layer                        │  │
│  │  - User Repository                                    │  │
│  │  - Memory Repository                                  │  │
│  │  - Resource Repository                                │  │
│  │  - Graph Repository                                   │  │
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

## Backend Architecture

### Layer Structure

#### 1. API Layer (`backend/app/api`)
- **Purpose**: Handle HTTP requests and responses
- **Components**:
  - Routers for each module (auth, memory, chat, etc.)
  - Middleware for authentication, CORS, telemetry
  - Dependency injection for database sessions
  - Request validation using Pydantic schemas

#### 2. Intelligence Layer (`backend/app/intelligence`)
- **Purpose**: AI-powered reasoning and decision making
- **Components**:
  - **Context Engine**: Assembles context from multiple sources
  - **Decision Engine**: Makes intelligent decisions based on context
  - **Memory Engine**: Classifies and links memories
  - **Entity Extractor**: Extracts entities from text
  - **Timeline Engine**: Analyzes temporal relationships
  - **Profile Engine**: Manages user preferences and profiles

#### 3. Specialized OS Modules
- **Productivity OS**: Task management, habits, reminders
- **Career OS**: Resume optimization, job matching
- **Study OS**: Flashcards, quizzes, learning roadmaps
- **Automation OS**: Workflow automation

#### 4. Repository Layer (`backend/app/repositories`)
- **Purpose**: Data access abstraction
- **Components**:
  - User Repository
  - Memory Repository
  - Resource Repository
  - Graph Repository
  - Productivity Repository
  - Career Repository

#### 5. Models Layer (`backend/app/models`)
- **Purpose**: Database ORM models
- **Components**:
  - Core Models (User, Memory, Resource, Note, Idea)
  - Productivity Models (Task, Habit, Reminder)
  - Career Models (Resume, Job Application)
  - Automation Models (Workflow, Trigger)

#### 6. Core Layer (`backend/app/core`)
- **Purpose**: Core configuration and utilities
- **Components**:
  - Configuration management
  - Database connection
  - Security (JWT, password hashing)
  - Logging

## Frontend Architecture

### Technology Stack
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Icons**: Lucide React

### Directory Structure
```
frontend/src/
├── app/              # Next.js App Router pages
│   ├── chat/         # Chat interface
│   ├── memories/     # Memory management
│   ├── notes/        # Notes management
│   ├── resources/    # Resource vault
│   ├── graph/        # Knowledge graph
│   └── login/        # Authentication
├── components/       # Reusable components
├── contexts/         # React contexts
└── lib/             # Utility functions
```

## Data Flow

### Request Flow
1. User makes request from frontend
2. Frontend sends HTTP request to backend API
3. API layer validates request
4. Intelligence layer processes request (if applicable)
5. Repository layer accesses database
6. Response flows back through layers
7. Frontend renders response

### AI Processing Flow
1. User input enters reasoning layer
2. Entity extractor identifies entities
3. Memory classifier categorizes input
4. Context engine assembles relevant context
5. Decision engine generates recommendations
6. Response is produced with assembled context

## Database Schema

### Core Tables
- **users**: User accounts and profiles
- **memories**: Long-term memory entries with embeddings
- **resources**: Uploaded documents and files
- **notes**: Smart notes with AI-generated tags
- **ideas**: Captured ideas and thoughts
- **knowledge_graph**: Entity relationships

### Productivity Tables
- **tasks**: Tasks and to-do items
- **habits**: Habit tracking data
- **reminders**: Reminder schedules

### Career Tables
- **resumes**: Resume data and optimizations
- **job_applications**: Job application tracking

### Automation Tables
- **workflows**: Automation workflows
- **triggers**: Workflow triggers

## Security Architecture

### Authentication
- JWT-based authentication
- Token expiration: 30 minutes (configurable)
- Secure password hashing with bcrypt

### Authorization
- Role-based access control
- User and superuser roles
- Resource ownership verification

### Data Security
- CORS configuration
- Rate limiting
- Input validation
- SQL injection prevention (via SQLAlchemy ORM)

## Scalability Considerations

### Horizontal Scaling
- Stateless API design
- Redis for session management
- Database connection pooling

### Vertical Scaling
- Configurable worker processes
- Async I/O for high concurrency
- Efficient memory usage

### Caching Strategy
- Redis for frequently accessed data
- Embedding caching
- API response caching

## Deployment Architecture

### Development
- Docker Compose for local development
- Hot reloading for both frontend and backend
- Local PostgreSQL with pgvector
- Local Redis instance

### Production
- Frontend: Vercel (CDN deployment)
- Backend: Render/Railway/AWS/GCP/Azure
- Database: Managed PostgreSQL with pgvector
- Cache: Managed Redis
- Container orchestration: Docker/Kubernetes

## Monitoring and Observability

### Logging
- Structured logging
- Request/response logging
- Error tracking
- Performance metrics

### Telemetry
- Request tracking middleware
- User activity monitoring
- API usage analytics

## Future Architecture Improvements

1. **Event-Driven Architecture**: Implement message queues for async processing
2. **Microservices**: Split into separate services for better scalability
3. **GraphQL API**: Alternative to REST for flexible queries
4. **Real-time Updates**: WebSocket support for live updates
5. **Multi-tenancy**: Support for multiple organizations
6. **Edge Computing**: Deploy intelligence layer at edge
