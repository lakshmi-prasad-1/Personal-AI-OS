from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.intent_system.action_executor import BaseAction, ActionResult
from app.core.intent_system.intent_classifier import Intent, IntentType
from app.models.core_models import User
from app.models.career_models import Resume, Application, SkillGap
from datetime import datetime
import uuid


class CareerActions(BaseAction):
    """Actions related to career assistance and job applications"""
    
    def can_handle(self, intent_type: IntentType) -> bool:
        return intent_type in [
            IntentType.RESUME_ANALYSIS,
            IntentType.JD_ANALYSIS,
            IntentType.CAREER_ADVICE,
            IntentType.INTERVIEW_PREP
        ]
    
    async def execute(self, intent: Intent) -> ActionResult:
        if intent.intent_type == IntentType.RESUME_ANALYSIS:
            return await self._analyze_resume(intent)
        elif intent.intent_type == IntentType.JD_ANALYSIS:
            return await self._analyze_jd(intent)
        elif intent.intent_type == IntentType.CAREER_ADVICE:
            return await self._career_advice(intent)
        elif intent.intent_type == IntentType.INTERVIEW_PREP:
            return await self._interview_prep(intent)
        
        return ActionResult(success=False, message="Unknown career action")
    
    async def _analyze_resume(self, intent: Intent) -> ActionResult:
        """Analyze uploaded resume"""
        try:
            # Check if user has a resume
            query = select(Resume).where(
                Resume.user_id == self.user.id
            ).order_by(Resume.created_at.desc()).limit(1)
            
            result = await self.db.execute(query)
            resume = result.scalar_one_or_none()
            
            if not resume:
                return ActionResult(
                    success=False,
                    message="Please upload your resume first for analysis."
                )
            
            # Generate analysis (simplified for now)
            analysis = self._generate_resume_analysis(resume)
            
            return ActionResult(
                success=True,
                message="Resume analysis complete. Here are my observations:",
                data=analysis
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to analyze resume: {str(e)}")
    
    async def _analyze_jd(self, intent: Intent) -> ActionResult:
        """Analyze job description and compare with resume"""
        try:
            # Get user's resume
            resume_query = select(Resume).where(
                Resume.user_id == self.user.id
            ).order_by(Resume.created_at.desc()).limit(1)
            
            resume_result = await self.db.execute(resume_query)
            resume = resume_result.scalar_one_or_none()
            
            if not resume:
                return ActionResult(
                    success=False,
                    message="Please upload your resume first for JD comparison."
                )
            
            # Generate JD analysis (simplified for now)
            analysis = self._generate_jd_analysis(resume, intent.entities)
            
            return ActionResult(
                success=True,
                message="Job description analysis complete. Here's how you match:",
                data=analysis
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to analyze JD: {str(e)}")
    
    async def _career_advice(self, intent: Intent) -> ActionResult:
        """Provide career advice based on user's profile"""
        try:
            # Get user's career data
            query = select(Resume, Application).where(
                Resume.user_id == self.user.id
            ).join(Application, Resume.user_id == Application.user_id, isouter=True)
            
            result = await self.db.execute(query)
            career_data = result.all()
            
            if not career_data:
                return ActionResult(
                    success=True,
                    message="Start by uploading your resume and tracking applications for personalized advice."
                )
            
            # Generate advice
            advice = self._generate_career_advice(career_data)
            
            return ActionResult(
                success=True,
                message="Here's my career advice for you:",
                data={"advice": advice}
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to generate career advice: {str(e)}")
    
    async def _interview_prep(self, intent: Intent) -> ActionResult:
        """Provide interview preparation guidance"""
        try:
            # Get interview questions from database
            from app.models.career_models import InterviewQuestion
            
            query = select(InterviewQuestion).where(
                InterviewQuestion.user_id == self.user.id
            ).order_by(InterviewQuestion.created_at.desc()).limit(10)
            
            result = await self.db.execute(query)
            questions = result.scalars().all()
            
            if questions:
                question_list = [q.question for q in questions]
                return ActionResult(
                    success=True,
                    message=f"Here are your saved interview questions to practice:",
                    data={"questions": question_list}
                )
            
            # Generate general interview tips
            tips = self._generate_interview_tips()
            
            return ActionResult(
                success=True,
                message="Here are some interview preparation tips:",
                data={"tips": tips}
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to provide interview prep: {str(e)}")
    
    def _generate_resume_analysis(self, resume: Resume) -> dict:
        """Generate resume analysis (simplified)"""
        return {
            "sections_found": ["summary", "experience", "education", "skills"],
            "suggestions": [
                "Consider adding more quantifiable achievements",
                "Ensure your skills match current job market trends",
                "Add a projects section to showcase practical work"
            ],
            "ats_score": 75,
            "missing_keywords": ["docker", "kubernetes", "cloud"],
            "improvement_areas": ["technical skills", "project descriptions"]
        }
    
    def _generate_jd_analysis(self, resume: Resume, entities: dict) -> dict:
        """Generate JD analysis (simplified)"""
        return {
            "match_score": 65,
            "matching_skills": ["python", "javascript", "react"],
            "missing_skills": ["docker", "aws", "kubernetes"],
            "recommendations": [
                "Learn Docker for containerization",
                "Add AWS certification to your profile",
                "Build a project using Kubernetes"
            ],
            "suggested_courses": [
                "Docker for Beginners (from your resources)",
                "AWS Cloud Practitioner (from your resources)"
            ]
        }
    
    def _generate_career_advice(self, career_data) -> List[str]:
        """Generate career advice"""
        return [
            "Focus on building projects that showcase full-stack skills",
            "Consider contributing to open source to demonstrate collaboration",
            "Keep your LinkedIn profile updated with recent projects",
            "Practice system design for senior roles",
            "Network with professionals in your target companies"
        ]
    
    def _generate_interview_tips(self) -> List[str]:
        """Generate interview preparation tips"""
        return [
            "Research the company thoroughly before the interview",
            "Practice STAR method for behavioral questions",
            "Prepare questions to ask the interviewer",
            "Review your past projects and be ready to discuss them",
            "Practice coding problems on platforms like LeetCode",
            "Mock interviews with friends or use AI tools"
        ]
