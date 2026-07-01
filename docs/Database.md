# Database Documentation

## Overview

AI Operating System uses PostgreSQL with the pgvector extension for storing structured data and vector embeddings. The database schema is managed using Alembic migrations.

## Database Technology

- **Database**: PostgreSQL 14+
- **Vector Extension**: pgvector
- **ORM**: SQLAlchemy 2.0 (async)
- **Migration Tool**: Alembic

## Schema Overview

### Core Tables

#### users
User accounts and authentication data.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### memories
Long-term memory entries with vector embeddings.

```sql
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    tags TEXT[],
    importance INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_embedding ON memories USING ivfflat (embedding vector_cosine_ops);
```

#### resources
Uploaded documents and files.

```sql
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT,
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size INTEGER,
    embedding vector(1536),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resources_user_id ON resources(user_id);
CREATE INDEX idx_resources_embedding ON resources USING ivfflat (embedding vector_cosine_ops);
```

#### notes
Smart notes with AI-generated tags.

```sql
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content TEXT,
    embedding vector(1536),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_embedding ON notes USING ivfflat (embedding vector_cosine_ops);
```

#### ideas
Captured ideas and thoughts.

```sql
CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536),
    tags TEXT[],
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_embedding ON ideas USING ivfflat (embedding vector_cosine_ops);
```

#### knowledge_graph
Entity relationships for knowledge graph.

```sql
CREATE TABLE knowledge_graph (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_entity VARCHAR(255) NOT NULL,
    target_entity VARCHAR(255) NOT NULL,
    relationship_type VARCHAR(100),
    confidence FLOAT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_graph_user_id ON knowledge_graph(user_id);
CREATE INDEX idx_graph_source ON knowledge_graph(source_entity);
CREATE INDEX idx_graph_target ON knowledge_graph(target_entity);
```

### Productivity Tables

#### tasks
Tasks and to-do items.

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

#### habits
Habit tracking data.

```sql
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(50),
    target_days TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_habits_user_id ON habits(user_id);
```

#### habit_logs
Habit completion logs.

```sql
CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

CREATE INDEX idx_habit_logs_habit_id ON habit_logs(habit_id);
CREATE INDEX idx_habit_logs_completed_at ON habit_logs(completed_at);
```

#### reminders
Reminder schedules.

```sql
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    repeat VARCHAR(50),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_remind_at ON reminders(remind_at);
```

### Career Tables

#### resumes
Resume data and optimizations.

```sql
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    summary TEXT,
    experience JSONB,
    education JSONB,
    skills TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
```

#### job_applications
Job application tracking.

```sql
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company VARCHAR(255),
    position VARCHAR(255),
    status VARCHAR(50),
    applied_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_job_applications_user_id ON job_applications(user_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);
```

### Study Tables

#### flashcards
Flashcard data.

```sql
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    subject VARCHAR(255),
    deck VARCHAR(255),
    difficulty VARCHAR(50),
    next_review TIMESTAMP WITH TIME ZONE,
    interval INTEGER DEFAULT 1,
    ease_factor FLOAT DEFAULT 2.5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX idx_flashcards_subject ON flashcards(subject);
CREATE INDEX idx_flashcards_next_review ON flashcards(next_review);
```

#### quizzes
Quiz data.

```sql
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    subject VARCHAR(255),
    questions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quizzes_user_id ON quizzes(user_id);
```

### Automation Tables

#### workflows
Automation workflows.

```sql
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger JSONB,
    actions JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workflows_user_id ON workflows(user_id);
```

#### workflow_executions
Workflow execution logs.

```sql
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    status VARCHAR(50),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    result JSONB,
    error TEXT
);

CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
```

## Vector Embeddings

### pgvector Extension

The database uses pgvector for storing and querying vector embeddings:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Embedding Configuration

- **Dimension**: 1536 (OpenAI text-embedding-3-small)
- **Index Type**: IVFFlat
- **Distance Metric**: Cosine similarity

### Creating Vector Index

```sql
CREATE INDEX idx_memories_embedding 
ON memories 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### Semantic Search Example

```sql
SELECT id, content, 
       1 - (embedding <=> '[0.1,0.2,0.3,...]') as similarity
FROM memories
WHERE user_id = 'user-uuid'
ORDER BY embedding <=> '[0.1,0.2,0.3,...]'
LIMIT 10;
```

## Database Migrations

### Running Migrations

```bash
cd backend
alembic upgrade head
```

### Creating a New Migration

```bash
alembic revision --autogenerate -m "description of changes"
```

### Rolling Back Migrations

```bash
alembic downgrade -1
```

### Migration History

```bash
alembic history
```

## Database Initialization

### Initialize Extensions

```bash
cd backend
python scripts/init_db.py
```

This script creates required extensions:
- `vector` for vector embeddings
- `pgcrypto` for encryption
- `uuid-ossp` for UUID generation

### Seed Database (Optional)

```bash
cd backend
python scripts/seed_db.py
```

This creates a default admin user:
- Email: `admin@example.com`
- Password: `admin123`

## Connection Configuration

### Development

```python
DATABASE_URL = "postgresql+asyncpg://admin:password@localhost:5432/aibrain"
```

### Production

```python
DATABASE_URL = "postgresql+asyncpg://user:password@host:port/dbname"
```

## Performance Optimization

### Indexing Strategy

- Primary keys on all tables
- Foreign key indexes
- Vector indexes for semantic search
- Composite indexes for common queries

### Query Optimization

- Use `EXPLAIN ANALYZE` to analyze query performance
- Optimize vector index parameters (lists, probes)
- Use connection pooling
- Enable query caching

### Connection Pooling

```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)
```

## Backup Strategy

### PostgreSQL Backup

```bash
# Full backup
pg_dump -U admin aibrain > backup.sql

# Schema only
pg_dump -U admin --schema-only aibrain > schema.sql

# Data only
pg_dump -U admin --data-only aibrain > data.sql
```

### Restore from Backup

```bash
psql -U admin aibrain < backup.sql
```

## Monitoring

### Key Metrics to Monitor

- Connection pool usage
- Query execution time
- Vector index performance
- Database size
- Slow queries

### Monitoring Queries

```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

## Security

### Best Practices

1. **Never commit credentials** to version control
2. **Use strong passwords** for database users
3. **Enable SSL** for database connections in production
4. **Use read replicas** for read-heavy workloads
5. **Regular backups** with encryption
6. **Monitor access logs** for suspicious activity
7. **Use connection pooling** to prevent connection exhaustion

### Row-Level Security

```sql
-- Enable RLS
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY user_memories ON memories
    FOR ALL
    TO authenticated_role
    USING (user_id = current_user_id());
```

## Troubleshooting

### Common Issues

#### pgvector Extension Not Found

```sql
-- Check if extension is available
SELECT * FROM pg_available_extensions WHERE name = 'vector';

-- Install if available
CREATE EXTENSION vector;
```

#### Connection Pool Exhausted

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Terminate idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND pid <> pg_backend_pid();
```

#### Slow Vector Queries

```sql
-- Rebuild index with different parameters
DROP INDEX idx_memories_embedding;
CREATE INDEX idx_memories_embedding 
ON memories 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 200);
```

## Maintenance

### Regular Maintenance Tasks

1. **Vacuum and Analyze**: Run weekly
   ```bash
   VACUUM ANALYZE;
   ```

2. **Reindex**: Run monthly
   ```bash
   REINDEX DATABASE aibrain;
   ```

3. **Update Statistics**: Run after large data changes
   ```bash
   ANALYZE;
   ```

4. **Check Index Usage**: Monitor monthly
   ```sql
   SELECT * FROM pg_stat_user_indexes;
   ```

## Data Retention

### Archiving Old Data

```sql
-- Archive old memories
INSERT INTO memories_archive
SELECT * FROM memories
WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM memories
WHERE created_at < NOW() - INTERVAL '1 year';
```

### Cleanup Strategy

- Archive data older than 1 year
- Delete soft-deleted records after 30 days
- Clean up old workflow executions
- Remove expired reminders
