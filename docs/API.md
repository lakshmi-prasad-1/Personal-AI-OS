# API Documentation

## Base URL

- **Development**: `http://localhost:8000/api/v1`
- **Production**: `https://your-backend-api.com/api/v1`

## Authentication

Most endpoints require authentication via JWT token.

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

**Response**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Using the Token

Include the token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Endpoints

### Health

#### Check Health
```http
GET /api/v1/health
```

**Response**:
```json
{
  "status": "healthy",
  "version": "2.0"
}
```

### Authentication

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "full_name": "John Doe"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

#### Get Current User
```http
GET /api/v1/auth/me
Authorization: Bearer <token>
```

### Users

#### Get User Profile
```http
GET /api/v1/users/me
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /api/v1/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "bio": "Software developer"
}
```

### Memory

#### List Memories
```http
GET /api/v1/memory
Authorization: Bearer <token>
Query Parameters:
- limit: number of results (default: 50)
- offset: pagination offset (default: 0)
- search: search query (optional)
```

#### Create Memory
```http
POST /api/v1/memory
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Important meeting with team tomorrow at 10am",
  "tags": ["work", "meeting"],
  "importance": 5
}
```

#### Get Memory
```http
GET /api/v1/memory/{memory_id}
Authorization: Bearer <token>
```

#### Update Memory
```http
PUT /api/v1/memory/{memory_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Updated content",
  "tags": ["work", "meeting", "updated"]
}
```

#### Delete Memory
```http
DELETE /api/v1/memory/{memory_id}
Authorization: Bearer <token>
```

### Chat

#### Send Message
```http
POST /api/v1/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "What are my tasks for today?",
  "context": "productivity"
}
```

**Response**:
```json
{
  "response": "You have 3 tasks for today...",
  "sources": ["memory_1", "memory_2"]
}
```

#### Get Chat History
```http
GET /api/v1/chat/history
Authorization: Bearer <token>
Query Parameters:
- limit: number of messages (default: 20)
```

### Notes

#### List Notes
```http
GET /api/v1/notes
Authorization: Bearer <token>
```

#### Create Note
```http
POST /api/v1/notes
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Project Ideas",
  "content": "1. Build AI assistant\n2. Create knowledge graph",
  "tags": ["ideas", "projects"]
}
```

#### Get Note
```http
GET /api/v1/notes/{note_id}
Authorization: Bearer <token>
```

#### Update Note
```http
PUT /api/v1/notes/{note_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content"
}
```

#### Delete Note
```http
DELETE /api/v1/notes/{note_id}
Authorization: Bearer <token>
```

### Resources

#### List Resources
```http
GET /api/v1/resources
Authorization: Bearer <token>
```

#### Upload Resource
```http
POST /api/v1/resources
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
title: "Document Title"
description: "Document description"
tags: ["document", "important"]
```

#### Get Resource
```http
GET /api/v1/resources/{resource_id}
Authorization: Bearer <token>
```

#### Delete Resource
```http
DELETE /api/v1/resources/{resource_id}
Authorization: Bearer <token>
```

### Search

#### Semantic Search
```http
GET /api/v1/search
Authorization: Bearer <token>
Query Parameters:
- q: search query (required)
- limit: number of results (default: 10)
- type: search type (all, memory, notes, resources)
```

**Response**:
```json
{
  "results": [
    {
      "type": "memory",
      "id": "memory_1",
      "content": "Search result content",
      "score": 0.95
    }
  ]
}
```

### Knowledge Graph

#### Get Graph
```http
GET /api/v1/graph
Authorization: Bearer <token>
Query Parameters:
- entity: filter by entity (optional)
- limit: number of nodes (default: 50)
```

#### Add Relationship
```http
POST /api/v1/graph/relationships
Authorization: Bearer <token>
Content-Type: application/json

{
  "source": "entity_1",
  "target": "entity_2",
  "relationship": "related_to"
}
```

### Productivity

#### Get Tasks
```http
GET /api/v1/productivity/tasks
Authorization: Bearer <token>
Query Parameters:
- status: filter by status (pending, completed, all)
- priority: filter by priority (high, medium, low)
```

#### Create Task
```http
POST /api/v1/productivity/tasks
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Complete project report",
  "description": "Write and submit the quarterly report",
  "due_date": "2026-07-15T10:00:00Z",
  "priority": "high",
  "tags": ["work", "report"]
}
```

#### Update Task
```http
PUT /api/v1/productivity/tasks/{task_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "completed",
  "completed_at": "2026-07-15T14:30:00Z"
}
```

#### Get Habits
```http
GET /api/v1/productivity/habits
Authorization: Bearer <token>
```

#### Create Habit
```http
POST /api/v1/productivity/habits
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Morning Exercise",
  "description": "30 minutes of exercise",
  "frequency": "daily",
  "target_days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
}
```

#### Get Reminders
```http
GET /api/v1/productivity/reminders
Authorization: Bearer <token>
```

#### Create Reminder
```http
POST /api/v1/productivity/reminders
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Team Meeting",
  "description": "Weekly sync with the team",
  "remind_at": "2026-07-15T09:00:00Z",
  "repeat": "weekly"
}
```

### Career

#### Get Resume
```http
GET /api/v1/career/resume
Authorization: Bearer <token>
```

#### Update Resume
```http
PUT /api/v1/career/resume
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "summary": "Software developer with 5 years experience",
  "experience": [...],
  "education": [...],
  "skills": [...]
}
```

#### Optimize Resume
```http
POST /api/v1/career/resume/optimize
Authorization: Bearer <token>
Content-Type: application/json

{
  "job_description": "Senior Software Engineer position..."
}
```

#### Get Job Matches
```http
GET /api/v1/career/jobs
Authorization: Bearer <token>
Query Parameters:
- location: job location (optional)
- keywords: search keywords (optional)
```

#### Track Job Application
```http
POST /api/v1/career/applications
Authorization: Bearer <token>
Content-Type: application/json

{
  "company": "Tech Company",
  "position": "Software Engineer",
  "status": "applied",
  "applied_date": "2026-07-01",
  "notes": "Applied through company website"
}
```

### Study

#### Get Flashcards
```http
GET /api/v1/study/flashcards
Authorization: Bearer <token>
Query Parameters:
- subject: filter by subject (optional)
- deck: filter by deck (optional)
```

#### Create Flashcard
```http
POST /api/v1/study/flashcards
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "What is the capital of France?",
  "answer": "Paris",
  "subject": "Geography",
  "deck": "Europe"
}
```

#### Generate Flashcards
```http
POST /api/v1/study/flashcards/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "Machine Learning",
  "count": 10,
  "difficulty": "intermediate"
}
```

#### Get Quizzes
```http
GET /api/v1/study/quizzes
Authorization: Bearer <token>
```

#### Generate Quiz
```http
POST /api/v1/study/quizzes/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "Python Programming",
  "question_count": 5,
  "difficulty": "beginner"
}
```

#### Get Learning Roadmap
```http
GET /api/v1/study/roadmaps/{topic}
Authorization: Bearer <token>
```

#### Generate Learning Roadmap
```http
POST /api/v1/study/roadmaps/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "Web Development",
  "duration_weeks": 12,
  "current_level": "beginner",
  "goal_level": "intermediate"
}
```

### Automation

#### Get Workflows
```http
GET /api/v1/automation/workflows
Authorization: Bearer <token>
```

#### Create Workflow
```http
POST /api/v1/automation/workflows
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Daily Summary",
  "description": "Generate daily summary of activities",
  "trigger": {
    "type": "schedule",
    "cron": "0 18 * * *"
  },
  "actions": [
    {
      "type": "generate_summary",
      "params": {
        "time_range": "today"
      }
    }
  ]
}
```

#### Execute Workflow
```http
POST /api/v1/automation/workflows/{workflow_id}/execute
Authorization: Bearer <token>
```

### Global Intelligence

#### Get Context
```http
GET /api/v1/global-intelligence/context
Authorization: Bearer <token>
Query Parameters:
- query: context query (required)
```

#### Get Recommendations
```http
GET /api/v1/global-intelligence/recommendations
Authorization: Bearer <token>
Query Parameters:
- type: recommendation type (tasks, habits, learning)
```

#### Get Insights
```http
GET /api/v1/global-intelligence/insights
Authorization: Bearer <token>
Query Parameters:
- time_range: day, week, month (default: week)
```

### Profile

#### Get Profile
```http
GET /api/v1/profile
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/v1/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "preferences": {
    "theme": "dark",
    "language": "en",
    "timezone": "UTC"
  },
  "goals": ["Learn Python", "Build a project"],
  "interests": ["AI", "Programming", "Productivity"]
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common HTTP Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **422 Unprocessable Entity**: Validation error
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

## Rate Limiting

- Default limit: 60 requests per minute
- Rate limit headers are included in responses:
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## Pagination

List endpoints support pagination via `limit` and `offset` parameters:

```http
GET /api/v1/memory?limit=20&offset=40
```

Response includes pagination metadata:

```json
{
  "items": [...],
  "total": 100,
  "limit": 20,
  "offset": 40
}
```

## Interactive Documentation

When the backend is running, access interactive API documentation:

- **Swagger UI**: `http://localhost:8000/api/v1/docs`
- **ReDoc**: `http://localhost:8000/api/v1/redoc`

## WebSockets

Real-time chat via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:8000/api/v1/chat/ws?token=<jwt_token>');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
};

ws.send(JSON.stringify({
  type: 'message',
  content: 'Hello AI'
}));
```

## SDK Examples

### Python

```python
import requests

BASE_URL = "http://localhost:8000/api/v1"

# Login
response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "user@example.com",
    "password": "password"
})
token = response.json()["access_token"]

# Create memory
headers = {"Authorization": f"Bearer {token}"}
response = requests.post(f"{BASE_URL}/memory", 
    headers=headers,
    json={"content": "Important meeting tomorrow"}
)
```

### JavaScript

```javascript
const BASE_URL = "http://localhost:8000/api/v1";

// Login
const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
});
const { access_token } = await loginResponse.json();

// Create memory
const memoryResponse = await fetch(`${BASE_URL}/memory`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${access_token}`
  },
  body: JSON.stringify({
    content: 'Important meeting tomorrow'
  })
});
```

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for API version history.
