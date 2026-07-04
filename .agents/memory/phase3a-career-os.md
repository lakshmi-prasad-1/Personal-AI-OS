---
name: Career OS Phase 3A
description: What was built, what's missing, and key architecture decisions for the Career OS feature set.
---

# Career OS Phase 3A — Implementation Notes

## Status: Complete (Version 1)

## What was already there (pre-existing)
- DB tables: careerProfiles, resumes, skills, career_projects, careerGoals, interviewTopics, interviewSessions
- Services: careerProfileService, resumeService, skillService, projectService, careerGoalService, interviewService, careerAnalyticsService
- Routes: careerProfile, resumes, skills, projects, careerGoals, interview
- AI tools in toolDefinitions.ts: update_career_profile, add_skill, add_project, add_career_goal, analyze_resume, get_career_recommendation, show_career_progress, start_mock_interview

## What was added in this phase
- DB tables: job_applications, company_trackers (in lib/db/src/schema/career.ts)
- Services: applicationService.ts, companyService.ts, jobAnalysisService.ts
- Routes: applications.ts, companies.ts (registered in routes/index.ts)
- AI tools: analyze_job_description, track_application, add_company, generate_career_roadmap
- Action engine handlers for all 4 new tools (in actionEngine.ts)
- LinkableEntityType union extended: "job_application" | "company" (knowledgeGraphService.ts)
- 8 frontend pages: career-dashboard, resumes, skills, career-projects, career-goals, interview, applications, companies
- Career OS nav group added to AppLayout.tsx
- All routes registered in App.tsx

## Known tech debt
- OpenAPI spec (lib/api-spec/openapi.yaml) has NO career endpoints — pages use apiGet/apiPost helpers directly
- No resume file upload (PDF/DOCX) — text only
- jobAnalysisService.generateRoadmap and analyzeJobDescription require OPENAI_API_KEY; degrade gracefully without it

## Architecture decisions
**Why:** Resume pages use apiGet/apiPost (same pattern as Study OS pages) not generated hooks — because the OpenAPI spec doesn't cover career endpoints yet. This is intentional tech debt to ship faster.

**Why:** jobApplicationsTable auto-appends a timeline entry whenever status changes (in applicationService.update). This is the only service that mutates input before passing to Drizzle — necessary for the audit trail requirement.
