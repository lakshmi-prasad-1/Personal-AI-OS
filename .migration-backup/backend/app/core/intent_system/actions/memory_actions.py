from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.intent_system.action_executor import BaseAction, ActionResult
from app.core.intent_system.intent_classifier import Intent, IntentType
from app.models.core_models import User, Memory
from app.models.productivity_models import Reminder
from datetime import datetime, timedelta
import uuid


class MemoryActions(BaseAction):
    """Actions related to memory and reminders"""
    
    def can_handle(self, intent_type: IntentType) -> bool:
        return intent_type in [
            IntentType.STORE_MEMORY,
            IntentType.RETRIEVE_MEMORY,
            IntentType.CREATE_REMINDER,
            IntentType.REMEMBER
        ]
    
    async def execute(self, intent: Intent) -> ActionResult:
        if intent.intent_type == IntentType.STORE_MEMORY:
            return await self._store_memory(intent)
        elif intent.intent_type == IntentType.RETRIEVE_MEMORY:
            return await self._retrieve_memory(intent)
        elif intent.intent_type == IntentType.CREATE_REMINDER:
            return await self._create_reminder(intent)
        elif intent.intent_type == IntentType.REMEMBER:
            return await self._remember(intent)
        
        return ActionResult(success=False, message="Unknown memory action")
    
    async def _store_memory(self, intent: Intent) -> ActionResult:
        """Store a memory from user input"""
        try:
            memory = Memory(
                id=uuid.uuid4(),
                user_id=self.user.id,
                content=intent.raw_text,
                metadata=intent.entities
            )
            self.db.add(memory)
            await self.db.commit()
            
            # Check if we should also create a reminder
            if "exam" in intent.raw_text.lower() or "meeting" in intent.raw_text.lower():
                await self._create_related_reminder(intent, memory.id)
            
            return ActionResult(
                success=True,
                message="I've remembered that. " + self._get_confirmation_message(intent),
                data={"memory_id": str(memory.id)}
            )
        except Exception as e:
            await self.db.rollback()
            return ActionResult(success=False, message=f"Failed to store memory: {str(e)}")
    
    async def _retrieve_memory(self, intent: Intent) -> ActionResult:
        """Retrieve memories based on query"""
        try:
            # Simple keyword search for now
            query = select(Memory).where(
                Memory.user_id == self.user.id
            ).order_by(Memory.created_at.desc()).limit(10)
            
            result = await self.db.execute(query)
            memories = result.scalars().all()
            
            if not memories:
                return ActionResult(success=True, message="I don't have any memories matching that.")
            
            memory_texts = [m.content for m in memories]
            return ActionResult(
                success=True,
                message=f"Found {len(memories)} related memories:",
                data={"memories": memory_texts}
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to retrieve memory: {str(e)}")
    
    async def _create_reminder(self, intent: Intent) -> ActionResult:
        """Create a reminder from user input"""
        try:
            # Parse time from entities
            reminder_time = self._parse_reminder_time(intent.entities)
            
            reminder = Reminder(
                id=uuid.uuid4(),
                user_id=self.user.id,
                title=intent.raw_text,
                due_date=reminder_time,
                is_completed=False,
                metadata=intent.entities
            )
            self.db.add(reminder)
            await self.db.commit()
            
            return ActionResult(
                success=True,
                message=f"Reminder set for {reminder_time.strftime('%Y-%m-%d %H:%M') if reminder_time else 'later'}",
                data={"reminder_id": str(reminder.id)}
            )
        except Exception as e:
            await self.db.rollback()
            return ActionResult(success=False, message=f"Failed to create reminder: {str(e)}")
    
    async def _remember(self, intent: Intent) -> ActionResult:
        """General remember action - stores memory and potentially creates reminder"""
        # This is similar to store_memory but more flexible
        return await self._store_memory(intent)
    
    async def _create_related_reminder(self, intent: Intent, memory_id: uuid.UUID):
        """Create a reminder related to a memory"""
        try:
            reminder_time = self._parse_reminder_time(intent.entities)
            
            reminder = Reminder(
                id=uuid.uuid4(),
                user_id=self.user.id,
                title=f"Remember: {intent.raw_text[:50]}...",
                due_date=reminder_time,
                is_completed=False,
                metadata={"memory_id": str(memory_id), **intent.entities}
            )
            self.db.add(reminder)
            await self.db.commit()
        except Exception:
            pass  # Don't fail if reminder creation fails
    
    def _parse_reminder_time(self, entities: dict) -> Optional[datetime]:
        """Parse reminder time from entities"""
        now = datetime.utcnow()
        
        if entities.get("tomorrow"):
            return now + timedelta(days=1)
        elif entities.get("today"):
            return now + timedelta(hours=2)  # Default to 2 hours from now
        elif entities.get("next_week"):
            return now + timedelta(weeks=1)
        elif entities.get("next_month"):
            return now + timedelta(days=30)
        
        # Day-specific parsing
        days = {
            "monday": 0, "tuesday": 1, "wednesday": 2, 
            "thursday": 3, "friday": 4, "saturday": 5, "sunday": 6
        }
        
        for day, day_num in days.items():
            if entities.get(day):
                current_day = now.weekday()
                days_until = (day_num - current_day) % 7
                if days_until == 0:
                    days_until = 7  # Next week if today
                return now + timedelta(days=days_until)
        
        return None
    
    def _get_confirmation_message(self, intent: Intent) -> str:
        """Generate a natural confirmation message"""
        text_lower = intent.raw_text.lower()
        
        if "exam" in text_lower:
            return "I'll remind you about your exam."
        elif "meeting" in text_lower:
            return "I've noted your meeting."
        elif "assignment" in text_lower:
            return "I'll help you track your assignment."
        else:
            return "I've stored that information."
