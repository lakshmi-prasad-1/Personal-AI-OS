from typing import Dict, Any, Optional, List
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core_models import User
from app.core.intent_system.intent_classifier import IntentClassifier, Intent
from app.core.intent_system.chat_service import ChatService, ChatResponse


class VoiceCommand(BaseModel):
    """Represents a voice command from the user"""
    transcript: str
    confidence: float = 1.0
    language: str = "en"
    metadata: Dict[str, Any] = {}


class VoiceResponse(BaseModel):
    """Response optimized for voice output"""
    text_response: str
    audio_url: Optional[str] = None
    intent: Optional[str] = None
    action_taken: Optional[str] = None
    follow_up_questions: Optional[List[str]] = None


class VoiceInterface:
    """Voice interface layer - designed to be pluggable without changing business logic"""
    
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
        self.chat_service = ChatService(db, user)
        self.intent_classifier = IntentClassifier()
    
    async def process_voice_command(self, command: VoiceCommand) -> VoiceResponse:
        """Process a voice command and return voice-optimized response"""
        # Process the transcript through the existing chat service
        chat_response = await self.chat_service.process_message(command.transcript)
        
        # Convert chat response to voice-optimized format
        voice_response = self._convert_to_voice_response(chat_response)
        
        return voice_response
    
    def _convert_to_voice_response(self, chat_response: ChatResponse) -> VoiceResponse:
        """Convert chat response to voice-optimized response"""
        # Simplify text for voice output
        voice_text = self._simplify_for_voice(chat_response.message)
        
        # Extract action taken
        action_taken = None
        if chat_response.action_result and chat_response.action_result.get("success"):
            action_taken = chat_response.action_result.get("message")
        
        # Generate follow-up questions if appropriate
        follow_up_questions = self._generate_voice_follow_ups(chat_response)
        
        return VoiceResponse(
            text_response=voice_text,
            intent=chat_response.intent.intent_type.value if chat_response.intent else None,
            action_taken=action_taken,
            follow_up_questions=follow_up_questions
        )
    
    def _simplify_for_voice(self, text: str) -> str:
        """Simplify text for natural voice output"""
        # Remove markdown formatting
        text = text.replace("**", "").replace("*", "")
        text = text.replace("`", "")
        
        # Simplify complex structures
        text = text.replace("•", "").replace("-", "")
        
        # Add natural pauses
        text = text.replace(". ", ". <pause> ")
        text = text.replace("! ", "! <pause> ")
        text = text.replace("? ", "? <pause> ")
        
        # Remove excessive whitespace
        text = " ".join(text.split())
        
        return text
    
    def _generate_voice_follow_ups(self, chat_response: ChatResponse) -> Optional[List[str]]:
        """Generate voice-friendly follow-up questions"""
        follow_ups = []
        
        if chat_response.suggestions:
            # Convert suggestions to voice questions
            for suggestion in chat_response.suggestions[:3]:  # Max 3 suggestions
                if suggestion.endswith("?"):
                    follow_ups.append(suggestion)
                else:
                    follow_ups.append(f"Would you like me to {suggestion.lower()}?")
        
        return follow_ups if follow_ups else None
    
    async def get_voice_commands_list(self) -> List[Dict[str, Any]]:
        """Get list of voice commands with examples"""
        return [
            {
                "category": "Tasks",
                "commands": [
                    {"phrase": "Add task", "example": "Add task: Complete React assignment"},
                    {"phrase": "Complete task", "example": "I finished today's DSA"},
                    {"phrase": "Show tasks", "example": "Show my pending tasks"}
                ]
            },
            {
                "category": "Memory",
                "commands": [
                    {"phrase": "Remember", "example": "Remember I have an exam next Monday"},
                    {"phrase": "Save resource", "example": "Save this YouTube link under React"}
                ]
            },
            {
                "category": "Study",
                "commands": [
                    {"phrase": "What to study", "example": "What should I study now?"},
                    {"phrase": "Study progress", "example": "Show my study progress"}
                ]
            },
            {
                "category": "Planning",
                "commands": [
                    {"phrase": "Plan day", "example": "Plan my tomorrow"},
                    {"phrase": "Plan week", "example": "Plan my next seven days"}
                ]
            }
        ]
    
    def get_voice_activation_phrases(self) -> List[str]:
        """Get phrases that can activate voice assistant"""
        return [
            "Hey Brain",
            "OK Brain",
            "Assistant",
            "AI Brain"
        ]
    
    async def handle_voice_activation(self, activation_phrase: str) -> bool:
        """Handle voice activation"""
        valid_phrases = self.get_voice_activation_phrases()
        return activation_phrase.lower() in [p.lower() for p in valid_phrases]
