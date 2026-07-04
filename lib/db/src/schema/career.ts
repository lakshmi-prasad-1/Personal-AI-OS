import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const careerProfilesTable = pgTable("career_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().unique().references(() => usersTable.id, { onDelete: "cascade" }),
  degree: text("degree"),
  university: text("university"),
  currentSemester: text("current_semester"),
  graduationYear: text("graduation_year"),
  preferredRoles: text("preferred_roles").array().notNull().default([]),
  preferredCompanies: text("preferred_companies").array().notNull().default([]),
  preferredLocations: text("preferred_locations").array().notNull().default([]),
  expectedSalary: text("expected_salary"),
  preferredWorkTypes: text("preferred_work_types").array().notNull().default([]), // internship | full_time | remote | hybrid
  softSkills: text("soft_skills").array().notNull().default([]),
  certificates: text("certificates").array().notNull().default([]),
  achievements: text("achievements").array().notNull().default([]),
  portfolioUrl: text("portfolio_url"),
  githubUrl: text("github_url"),
  linkedinUrl: text("linkedin_url"),
  leetcodeUrl: text("leetcode_url"),
  codeforcesUrl: text("codeforces_url"),
  hackerrankUrl: text("hackerrank_url"),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const resumesTable = pgTable("resumes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category").notNull().default("general"), // general | frontend | backend | ai | full_stack
  version: integer("version").notNull().default(1),
  content: text("content").notNull().default(""),
  notes: text("notes").notNull().default(""),
  tags: text("tags").array().notNull().default([]),
  isActive: text("is_active").notNull().default("true"),
  analysis: jsonb("analysis"),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const skillsTable = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull().default("other"), // programming_language | framework | library | database | cloud | devops | ai_ml | dsa | system_design | soft_skill | other
  level: text("level").notNull().default("beginner"), // beginner | intermediate | advanced | expert
  confidence: integer("confidence").notNull().default(50),
  experience: text("experience").notNull().default(""),
  projectsUsed: text("projects_used").array().notNull().default([]),
  learningProgress: integer("learning_progress").notNull().default(0),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const projectsTable = pgTable("career_projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  techStack: text("tech_stack").array().notNull().default([]),
  githubUrl: text("github_url"),
  demoUrl: text("demo_url"),
  status: text("status").notNull().default("in_progress"), // planning | in_progress | completed | archived
  difficulty: text("difficulty").notNull().default("medium"), // easy | medium | hard
  role: text("role").notNull().default(""),
  achievements: text("achievements").array().notNull().default([]),
  challenges: text("challenges").notNull().default(""),
  lessonsLearned: text("lessons_learned").notNull().default(""),
  skillsUsed: text("skills_used").array().notNull().default([]),
  usedInResume: text("used_in_resume").notNull().default("false"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const careerGoalsTable = pgTable("career_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  type: text("type").notNull().default("short_term"), // short_term | long_term
  targetCompanies: text("target_companies").array().notNull().default([]),
  targetRoles: text("target_roles").array().notNull().default([]),
  targetTechnologies: text("target_technologies").array().notNull().default([]),
  milestones: jsonb("milestones").notNull().default([]),
  progressPercent: integer("progress_percent").notNull().default(0),
  targetDate: text("target_date"),
  status: text("status").notNull().default("active"), // active | completed | abandoned
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const interviewTopicsTable = pgTable("interview_topics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  category: text("category").notNull().default("coding"), // coding | behavioral | hr | system_design
  question: text("question").notNull().default(""),
  idealAnswerNotes: text("ideal_answer_notes").notNull().default(""),
  revisionStatus: text("revision_status").notNull().default("not_started"), // not_started | in_progress | mastered
  confidenceScore: integer("confidence_score").notNull().default(0),
  source: text("source").notNull().default("manual"), // manual | ai
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const interviewSessionsTable = pgTable("interview_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("technical"), // technical | behavioral | hr | coding | project_discussion | resume_discussion
  questions: jsonb("questions").notNull().default([]), // [{question, answer, feedback, score}]
  overallScore: integer("overall_score").notNull().default(0),
  feedback: text("feedback").notNull().default(""),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCareerProfileSchema = createInsertSchema(careerProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCareerProfile = z.infer<typeof insertCareerProfileSchema>;
export type CareerProfile = typeof careerProfilesTable.$inferSelect;

export const insertResumeSchema = createInsertSchema(resumesTable).omit({ id: true, createdAt: true, updatedAt: true, analysis: true, analyzedAt: true });
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type Resume = typeof resumesTable.$inferSelect;

export const insertSkillSchema = createInsertSchema(skillsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type Skill = typeof skillsTable.$inferSelect;

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

export const insertCareerGoalSchema = createInsertSchema(careerGoalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCareerGoal = z.infer<typeof insertCareerGoalSchema>;
export type CareerGoal = typeof careerGoalsTable.$inferSelect;

export const insertInterviewTopicSchema = createInsertSchema(interviewTopicsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInterviewTopic = z.infer<typeof insertInterviewTopicSchema>;
export type InterviewTopic = typeof interviewTopicsTable.$inferSelect;

export const insertInterviewSessionSchema = createInsertSchema(interviewSessionsTable).omit({ id: true, completedAt: true });
export type InsertInterviewSession = z.infer<typeof insertInterviewSessionSchema>;
export type InterviewSession = typeof interviewSessionsTable.$inferSelect;
