from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.intent_system.action_executor import BaseAction, ActionResult
from app.core.intent_system.intent_classifier import Intent, IntentType
from app.models.core_models import User, Idea
from datetime import datetime
import uuid


class IdeaActions(BaseAction):
    """Actions related to ideas and innovation tracking"""
    
    def can_handle(self, intent_type: IntentType) -> bool:
        return intent_type in [
            IntentType.STORE_IDEA,
            IntentType.RETRIEVE_IDEA
        ]
    
    async def execute(self, intent: Intent) -> ActionResult:
        if intent.intent_type == IntentType.STORE_IDEA:
            return await self._store_idea(intent)
        elif intent.intent_type == IntentType.RETRIEVE_IDEA:
            return await self._retrieve_idea(intent)
        
        return ActionResult(success=False, message="Unknown idea action")
    
    async def _store_idea(self, intent: Intent) -> ActionResult:
        """Store an idea from user input"""
        try:
            context = intent.entities.get("context", "general")
            title = self._extract_idea_title(intent.raw_text)
            
            idea = Idea(
                id=uuid.uuid4(),
                user_id=self.user.id,
                title=title,
                description=intent.raw_text,
                category=context,
                metadata=intent.entities,
                status="draft"
            )
            self.db.add(idea)
            await self.db.commit()
            
            return ActionResult(
                success=True,
                message=f"Idea saved to your vault: {title}",
                data={"idea_id": str(idea.id)}
            )
        except Exception as e:
            await self.db.rollback()
            return ActionResult(success=False, message=f"Failed to store idea: {str(e)}")
    
    async def _retrieve_idea(self, intent: Intent) -> ActionResult:
        """Retrieve ideas based on criteria"""
        try:
            query = select(Idea).where(
                Idea.user_id == self.user.id
            ).order_by(Idea.created_at.desc()).limit(10)
            
            result = await self.db.execute(query)
            ideas = result.scalars().all()
            
            if not ideas:
                return ActionResult(success=True, message="No ideas found in your vault.")
            
            idea_list = [f"- {i.title} ({i.category})" for i in ideas]
            
            return ActionResult(
                success=True,
                message=f"Found {len(ideas)} ideas in your vault:",
                data={"ideas": idea_list}
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to retrieve ideas: {str(e)}")
    
    def _extract_idea_title(self, text: str) -> str:
        """Extract idea title from text"""
        text_lower = text.lower()
        
        if "for" in text_lower:
            parts = text_lower.split("for")
            if len(parts) > 1:
                return parts[1].strip().capitalize()
        
        return "New Idea"
