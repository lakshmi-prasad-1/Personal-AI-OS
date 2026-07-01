# Deployment Guide

This guide covers deploying AI Operating System to various platforms.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
- [Backend Deployment Options](#backend-deployment-options)
  - [Render](#render)
  - [Railway](#railway)
  - [AWS](#aws)
  - [Google Cloud Platform](#google-cloud-platform)
  - [Azure](#azure)
- [Docker Deployment](#docker-deployment)
- [Post-Deployment Steps](#post-deployment-steps)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Services
- PostgreSQL 14+ with pgvector extension
- Redis 7+
- OpenAI API key

### Required Tools
- Docker (for containerized deployment)
- Git
- Node.js 18+ (for local builds)
- Python 3.10+ (for local builds)

## Environment Variables

### Backend Environment Variables

Create a `.env` file in the backend directory:

```bash
# Database Configuration
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_secure_password
POSTGRES_SERVER=your-db-host
POSTGRES_PORT=5432
POSTGRES_DB=aibrain

# Redis Configuration
REDIS_HOST=your-redis-host
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
FRONTEND_URL=https://your-frontend-url.com
CORS_ORIGINS=https://your-frontend-url.com

# File Upload
UPLOAD_MAX_SIZE_MB=10

# Rate Limiting
RATE_LIMIT_PER_MINUTE=60
```

### Frontend Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
NEXT_PUBLIC_API_URL=https://your-backend-api.com/api/v1
```

## Database Setup

### PostgreSQL with pgvector

#### Using Docker
```bash
docker run -d \
  --name ai-brain-db \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=aibrain \
  -p 5432:5432 \
  ankane/pgvector:latest
```

#### Using Managed Services
- **Render**: Create PostgreSQL database, enable pgvector extension
- **Railway**: Create PostgreSQL service
- **AWS RDS**: Use PostgreSQL 14+, manually enable pgvector
- **Google Cloud SQL**: Use PostgreSQL 14+, manually enable pgvector
- **Azure Database**: Use PostgreSQL 14+, manually enable pgvector

### Enable Extensions

Connect to your database and run:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### Run Migrations

```bash
cd backend
alembic upgrade head
```

## Frontend Deployment (Vercel)

### Step 1: Connect GitHub Repository

1. Go to [Vercel](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository

### Step 2: Configure Build Settings

Vercel will auto-detect Next.js. Verify settings:

- **Framework Preset**: Next.js
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/.next`
- **Install Command**: `cd frontend && npm install`

### Step 3: Add Environment Variables

Add these in Vercel dashboard:

```
NEXT_PUBLIC_API_URL=https://your-backend-api.com/api/v1
```

### Step 4: Deploy

Click "Deploy". Vercel will build and deploy your frontend.

### Step 5: Configure Domain

- Use default Vercel domain or
- Add custom domain in project settings

## Backend Deployment Options

### Render

#### Step 1: Create PostgreSQL Database

1. Go to Render dashboard
2. Create new PostgreSQL database
3. Note connection details

#### Step 2: Create Redis Instance

1. Create new Redis instance
2. Note connection details

#### Step 3: Deploy Backend

1. Create new "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables (see above)
5. Deploy

#### Step 4: Enable pgvector

After database creation, connect via shell and run:

```bash
psql $DATABASE_URL
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

#### Step 5: Run Migrations

Add a deploy hook or run manually:

```bash
alembic upgrade head
```

### Railway

#### Step 1: Create Project

1. Go to Railway
2. Create new project
3. Import GitHub repository

#### Step 2: Add Services

1. Add PostgreSQL service
2. Add Redis service

#### Step 3: Configure Backend

1. Add backend service from repository
2. Set root directory to `backend`
3. Add environment variables
4. Railway will auto-detect Python

#### Step 4: Deploy

Railway will automatically deploy all services.

### AWS

#### Option 1: AWS App Runner

1. Push code to GitHub
2. Create App Runner service
3. Connect GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port 8080`
5. Add environment variables
6. Deploy

#### Option 2: AWS ECS

1. Build Docker image: `docker build -t ai-brain-os ./backend`
2. Push to ECR
3. Create ECS task definition
4. Create ECS service
5. Configure load balancer
6. Add environment variables

#### Option 3: AWS Lambda

1. Package application for Lambda
2. Use AWS Serverless Application Model (SAM)
3. Configure API Gateway
4. Deploy with `sam deploy`

### Google Cloud Platform

#### Option 1: Cloud Run

1. Build Docker image: `docker build -t ai-brain-os ./backend`
2. Push to Container Registry
3. Create Cloud Run service
4. Configure:
   - **Port**: 8000
   - **Memory**: 1GB+
   - **CPU**: 1+
5. Add environment variables
6. Deploy

#### Option 2: App Engine

Use the provided `deploy/gcp/app.yaml`:

```bash
gcloud app deploy deploy/gcp/app.yaml
```

### Azure

#### Option 1: Azure Container Instances

1. Build Docker image
2. Push to Azure Container Registry
3. Create Container Instance
4. Configure ports and environment variables
5. Deploy

#### Option 2: Azure App Service

Use the provided `deploy/azure/deploy.json`:

```bash
az deployment group create \
  --resource-group myResourceGroup \
  --template-file deploy/azure/deploy.json
```

## Docker Deployment

### Development

```bash
docker-compose up -d
```

### Production

```bash
docker-compose -f docker-compose.production.yml up -d
```

### Custom Docker Build

#### Backend
```bash
cd backend
docker build -t ai-brain-backend .
docker run -p 8000:8000 --env-file .env ai-brain-backend
```

#### Frontend
```bash
cd frontend
docker build -t ai-brain-frontend .
docker run -p 3000:3000 ai-brain-frontend
```

## Post-Deployment Steps

### 1. Verify Database Connection

```bash
curl https://your-backend-api.com/api/v1/health
```

### 2. Test Authentication

```bash
curl -X POST https://your-backend-api.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'
```

### 3. Run Database Seed (Optional)

```bash
cd backend
python scripts/seed_db.py
```

### 4. Monitor Logs

Check platform-specific logs for errors:
- **Render**: Dashboard logs
- **Railway**: Service logs
- **AWS**: CloudWatch
- **GCP**: Cloud Logging
- **Azure**: Monitor

### 5. Configure Domain (Optional)

- Add custom domain to frontend (Vercel)
- Configure DNS for backend
- Update CORS origins in backend

## Troubleshooting

### Database Connection Issues

**Problem**: Backend cannot connect to database

**Solutions**:
1. Verify database is accessible
2. Check firewall rules
3. Verify connection string
4. Ensure pgvector extension is enabled

### CORS Errors

**Problem**: Frontend cannot connect to backend

**Solutions**:
1. Update `CORS_ORIGINS` in backend
2. Verify `FRONTEND_URL` is correct
3. Check browser console for specific error

### OpenAI API Errors

**Problem**: AI features not working

**Solutions**:
1. Verify `OPENAI_API_KEY` is valid
2. Check API quota
3. Verify model names are correct

### Migration Failures

**Problem**: Alembic migrations fail

**Solutions**:
1. Check database connection
2. Verify pgvector extension
3. Check migration version
4. Manually run SQL if needed

### Build Failures

**Problem**: Frontend or backend build fails

**Solutions**:
1. Check dependency versions
2. Verify Node.js/Python versions
3. Clear cache: `npm cache clean` or `pip cache purge`
4. Check build logs for specific errors

## Security Best Practices

1. **Never commit `.env` files**
2. **Use strong `SECRET_KEY`**: Generate with `openssl rand -hex 32`
3. **Rotate credentials regularly**
4. **Enable HTTPS only**
5. **Use managed database services**
6. **Enable database backups**
7. **Monitor for suspicious activity**
8. **Keep dependencies updated**

## Performance Optimization

1. **Enable Redis caching**
2. **Use CDN for static assets**
3. **Optimize database queries**
4. **Enable connection pooling**
5. **Use async operations**
6. **Monitor resource usage**
7. **Scale horizontally when needed**

## Monitoring

### Recommended Tools
- **Sentry**: Error tracking
- **Datadog/New Relic**: APM
- **Grafana**: Metrics visualization
- **Prometheus**: Metrics collection

### Key Metrics to Monitor
- Response times
- Error rates
- Database connection pool
- Redis memory usage
- API rate limits
- OpenAI API usage

## Backup Strategy

### Database Backups
- Enable automated backups (managed services)
- Export regular snapshots: `pg_dump`
- Store backups in multiple locations

### Redis Backups
- Enable Redis persistence
- Regular snapshot exports

### Application Backups
- Version control (Git)
- Docker image versioning
- Configuration backups

## Scaling

### Horizontal Scaling
- Load balancer configuration
- Multiple backend instances
- Session management via Redis

### Vertical Scaling
- Increase CPU/memory allocation
- Optimize database queries
- Enable caching

## Cost Optimization

1. **Use appropriate instance sizes**
2. **Enable auto-scaling**
3. **Use spot instances (AWS)**
4. **Optimize OpenAI API usage**
5. **Enable database connection pooling**
6. **Use CDN for static assets**
