from typing import Dict, List, Optional, Any
from enum import Enum
from pydantic import BaseModel, Field


class IntentType(str, Enum):
    """Types of intents the AI can understand"""
    # Memory & Knowledge
    REMEMBER = "remember"
    STORE_MEMORY = "store_memory"
    RETRIEVE_MEMORY = "retrieve_memory"
    
    # Tasks & Productivity
    CREATE_TASK = "create_task"
    UPDATE_TASK = "update_task"
    COMPLETE_TASK = "complete_task"
    LIST_TASKS = "list_tasks"
    
    # Reminders
    CREATE_REMINDER = "create_reminder"
    UPDATE_REMINDER = "update_reminder"
    
    # Resources
    STORE_RESOURCE = "store_resource"
    RETRIEVE_RESOURCE = "retrieve_resource"
    SEARCH_RESOURCES = "search_resources"
    
    # Ideas
    STORE_IDEA = "store_idea"
    RETRIEVE_IDEA = "retrieve_idea"
    
    # Planning
    CREATE_PLAN = "create_plan"
    UPDATE_PLAN = "update_plan"
    GENERATE_SCHEDULE = "generate_schedule"
    
    # Study Assistant
    STUDY_PLAN = "study_plan"
    WHAT_TO_STUDY = "what_to_study"
    STUDY_PROGRESS = "study_progress"
    UPDATE_STUDY_PROGRESS = "update_study_progress"
    
    # Career Assistant
    RESUME_ANALYSIS = "resume_analysis"
    JD_ANALYSIS = "jd_analysis"
    CAREER_ADVICE = "career_adVICE"
    INTERVIEW_PREP = "interview_prep"
    
    # Productivity
    PRODUCTIVITY_ANALYSIS = "productivity_analysis"
    OPTIMIZE_SCHEDULE = "optimize_schedule"
    DAILY_SUMMARY = "daily_summary"
    
    # General
    CHAT = "chat"
    HELP = "help"
    UNKNOWN = "unknown"


class Intent(BaseModel):
    """Represents a classified intent from user input"""
    intent_type: IntentType
    confidence: float = Field(ge=0.0, le=1.0)
    entities: Dict[str, Any] = Field(default_factory=dict)
    raw_text: str
    reasoning: Optional[str] = None


class IntentClassifier:
    """Classifies user intent from natural language input"""
    
    def __init__(self):
        self.intent_patterns = self._build_intent_patterns()
    
    def _build_intent_patterns(self) -> Dict[IntentType, List[str]]:
        """Build pattern matching rules for intent classification"""
        return {
            IntentType.REMEMBER: [
                "remember", "keep in mind", "don't forget", "note that",
                "save this", "store this", "memorize"
            ],
            IntentType.STORE_MEMORY: [
                "remember i have", "i have an exam", "i have a meeting",
                "i need to", "don't forget i", "keep in mind that"
            ],
            IntentType.RETRIEVE_MEMORY: [
                "what did i", "what do i remember", "what was i thinking",
                "what did i decide", "what did i say about"
            ],
            IntentType.CREATE_TASK: [
                "add task", "create task", "new task", "i need to",
                "i have to", "don't forget to", "remind me to"
            ],
            IntentType.UPDATE_TASK: [
                "update task", "change task", "modify task"
            ],
            IntentType.COMPLETE_TASK: [
                "finished", "completed", "done with", "i finished",
                "completed today's", "i'm done with"
            ],
            IntentType.LIST_TASKS: [
                "show tasks", "what tasks", "my tasks", "unfinished tasks"
            ],
            IntentType.CREATE_REMINDER: [
                "remind me", "set reminder", "remind me to", "don't forget to"
            ],
            IntentType.STORE_RESOURCE: [
                "save this", "save link", "save resource", "add to resources",
                "save under", "save article", "save video"
            ],
            IntentType.SEARCH_RESOURCES: [
                "show resources", "find resources", "search resources",
                "unfinished resources", "show me resources"
            ],
            IntentType.STORE_IDEA: [
                "i have an idea", "idea for", "new idea", "thought of"
            ],
            IntentType.RETRIEVE_IDEA: [
                "what ideas", "my ideas", "show ideas"
            ],
            IntentType.CREATE_PLAN: [
                "plan my", "create a plan", "make a plan"
            ],
            IntentType.GENERATE_SCHEDULE: [
                "plan my next", "generate schedule", "make schedule",
                "plan tomorrow", "plan this week"
            ],
            IntentType.WHAT_TO_STUDY: [
                "what should i study", "what to study", "what should i learn",
                "what should i focus on", "study plan"
            ],
            IntentType.STUDY_PROGRESS: [
                "study progress", "how am i doing", "learning progress"
            ],
            IntentType.UPDATE_STUDY_PROGRESS: [
                "finished studying", "done studying", "completed study",
                "finished today's", "finished dsa"
            ],
            IntentType.RESUME_ANALYSIS: [
                "analyze resume", "check resume", "review resume"
            ],
            IntentType.JD_ANALYSIS: [
                "analyze job description", "check jd", "review job posting"
            ],
            IntentType.CAREER_ADVICE: [
                "career advice", "career help", "job advice"
            ],
            IntentType.PRODUCTIVITY_ANALYSIS: [
                "productivity", "how productive", "time analysis"
            ],
            IntentType.OPTIMIZE_SCHEDULE: [
                "optimize", "better schedule", "improve schedule"
            ],
            IntentType.DAILY_SUMMARY: [
                "daily summary", "what did i do", "summary of today"
            ],
            IntentType.HELP: [
                "help", "what can you do", "how to use"
            ]
        }
    
    def classify(self, text: str) -> Intent:
        """Classify intent from natural language text"""
        text_lower = text.lower().strip()
        
        # Score each intent based on pattern matches
        intent_scores = {}
        matched_patterns = {}
        
        for intent_type, patterns in self.intent_patterns.items():
            score = 0.0
            matched = []
            
            for pattern in patterns:
                if pattern in text_lower:
                    score += 0.3
                    matched.append(pattern)
            
            if score > 0:
                intent_scores[intent_type] = min(score, 1.0)
                matched_patterns[intent_type] = matched
        
        # Find highest scoring intent
        if intent_scores:
            best_intent = max(intent_scores.items(), key=lambda x: x[1])
            intent_type, confidence = best_intent
            
            # Extract entities based on intent
            entities = self._extract_entities(text, intent_type)
            
            return Intent(
                intent_type=intent_type,
                confidence=confidence,
                entities=entities,
                raw_text=text,
                reasoning=f"Matched patterns: {matched_patterns[intent_type]}"
            )
        
        return Intent(
            intent_type=IntentType.UNKNOWN,
            confidence=0.0,
            entities={},
            raw_text=text,
            reasoning="No matching patterns found"
        )
    
    def _extract_entities(self, text: str, intent_type: IntentType) -> Dict[str, Any]:
        """Extract relevant entities from text based on intent"""
        entities = {}
        text_lower = text.lower()
        
        # Time entities
        time_keywords = {
            "tomorrow": "tomorrow",
            "today": "today",
            "next week": "next_week",
            "next month": "next_month",
            "monday": "monday",
            "tuesday": "tuesday",
            "wednesday": "wednesday",
            "thursday": "thursday",
            "friday": "friday",
            "saturday": "saturday",
            "sunday": "sunday"
        }
        
        for keyword, entity_key in time_keywords.items():
            if keyword in text_lower:
                entities[entity_key] = True
        
        # Task/Activity entities
        if intent_type in [IntentType.CREATE_TASK, IntentType.COMPLETE_TASK, IntentType.UPDATE_STUDY_PROGRESS]:
            # Extract what the task is about
            if "dsa" in text_lower:
                entities["topic"] = "DSA"
            elif "react" in text_lower:
                entities["topic"] = "React"
            elif "assignment" in text_lower:
                entities["type"] = "assignment"
            elif "exam" in text_lower:
                entities["type"] = "exam"
            elif "project" in text_lower:
                entities["type"] = "project"
        
        # Resource entities
        if intent_type == IntentType.STORE_RESOURCE:
            if "youtube" in text_lower or "video" in text_lower:
                entities["resource_type"] = "video"
            elif "article" in text_lower or "blog" in text_lower:
                entities["resource_type"] = "article"
            elif "course" in text_lower:
                entities["resource_type"] = "course"
            
            # Extract category/tag
            if "under" in text_lower:
                parts = text_lower.split("under")
                if len(parts) > 1:
                    entities["category"] = parts[1].strip()
        
        # Idea entities
        if intent_type == IntentType.STORE_IDEA:
            if "for" in text_lower:
                parts = text_lower.split("for")
                if len(parts) > 1:
                    entities["context"] = parts[1].strip()
        
        return entities
