from typing import Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core_models import User
from app.core.intent_system.intent_classifier import IntentClassifier, Intent
from app.core.intent_system.action_executor import ActionExecutor
from app.core.intent_system.context_manager import ContextManager
from app.core.intent_system.decision_engine import DecisionEngine


class ChatResponse(BaseModel):
    """Response from the AI chat service"""
    message: str
    intent: Optional[Intent] = None
    action_result: Optional[Dict[str, Any]] = None
    suggestions: Optional[list] = None
    context_summary: Optional[str] = None


class ChatService:
    """Main chat service that orchestrates intent understanding and action execution"""
    
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
        self.classifier = IntentClassifier()
        self.context_manager = ContextManager(db, user)
        self.decision_engine = DecisionEngine(db, user)
    
    async def process_message(self, message: str) -> ChatResponse:
        """Process a user message and generate appropriate response"""
        # Classify intent
        intent = self.classifier.classify(message)
        
        # Build context
        context = await self.context_manager.build_context()
        
        # Execute action if intent is clear
        action_executor = ActionExecutor(self.db, self.user)
        action_result = None
        
        if intent.intent_type.value != "unknown" and intent.confidence > 0.3:
            result = await action_executor.execute(intent)
            action_result = {
                "success": result.success,
                "message": result.message,
                "data": result.data
            }
            
            # Log activity to context
            await self.context_manager.add_recent_activity(
                activity_type=intent.intent_type.value,
                description=message,
                metadata={"intent": intent.intent_type.value, "confidence": intent.confidence}
            )
            
            response_message = result.message
        else:
            # Handle general chat or low-confidence intents
            response_message = await self._handle_general_chat(message, intent, context)
        
        # Get suggestions from decision engine
        suggestions = await self.decision_engine.generate_recommendations()
        
        # Get context summary
        context_summary = self.context_manager.get_context_summary()
        
        return ChatResponse(
            message=response_message,
            intent=intent,
            action_result=action_result,
            suggestions=[s.action for s in suggestions],
            context_summary=context_summary
        )
    
    async def _handle_general_chat(self, message: str, intent: Intent, context) -> str:
        """Handle general chat messages or low-confidence intents"""
        message_lower = message.lower()
        
        # Check for help requests
        if "help" in message_lower or "what can you do" in message_lower:
            return self._get_help_message()
        
        # Check for status requests
        if "status" in message_lower or "how am i doing" in message_lower:
            return await self._get_status_update(context)
        
        # Check for planning requests
        if "plan" in message_lower or "schedule" in message_lower:
            return "I can help you plan! Tell me what you'd like to plan (today, tomorrow, this week) and I'll analyze your current tasks and deadlines."
        
        # Check for decision engine suggestions
        suggestion = await self.decision_engine.get_action_suggestion(message)
        if suggestion:
            return suggestion
        
        # Default response
        return f"I understood you're saying: \"{message}\". Could you be more specific about what you'd like me to help you with? I can help with tasks, reminders, study planning, career advice, and more."
    
    def _get_help_message(self) -> str:
        """Get help message with available commands"""
        return """I can help you with:
        
📝 **Tasks & Productivity**
- "Add task: Complete React assignment"
- "I finished today's DSA"
- "Show my pending tasks"
- "Plan my tomorrow"

🧠 **Memory & Learning**
- "Remember I have an exam next Monday"
- "Save this YouTube link under React resources"
- "What should I study now?"
- "Show my study progress"

💼 **Career & Jobs**
- "Analyze my resume"
- "Compare this JD with my skills"
- "Interview preparation tips"

⏰ **Reminders & Planning**
- "Remind me to submit assignment tomorrow"
- "Plan my next seven days"
- "What did I decide last month?"

💡 **Ideas & Resources**
- "I have an idea for an AI project"
- "Save this article"
- "Show my unfinished React resources"

Just chat naturally and I'll understand what you need!"""
    
    async def _get_status_update(self, context) -> str:
        """Get user status update"""
        status_parts = []
        
        if context.active_tasks:
            status_parts.append(f"You have {len(context.active_tasks)} active tasks")
        
        if context.current_goals:
            status_parts.append(f"{len(context.current_goals)} active goals")
        
        if context.time_context:
            status_parts.append(f"It's {context.time_context}")
        
        if context.current_focus:
            status_parts.append(f"Currently focused on: {context.current_focus}")
        
        if not status_parts:
            return "You're all caught up! No active tasks or goals. What would you like to work on?"
        
        return ". ".join(status_parts) + "."
    
    async def get_conversation_context(self) -> Dict[str, Any]:
        """Get current conversation context"""
        context = await self.context_manager.build_context()
        recommendations = await self.decision_engine.generate_recommendations()
        
        return {
            "context": context.dict(),
            "recommendations": [r.dict() for r in recommendations],
            "recent_activities": context.recent_activities
        }
