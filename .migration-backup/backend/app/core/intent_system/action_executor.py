from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.intent_system.intent_classifier import Intent, IntentType
from app.models.core_models import User


class ActionResult(BaseModel):
    """Result of an action execution"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    follow_up_actions: Optional[List[str]] = None


class BaseAction(ABC):
    """Base class for all actions"""
    
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
    
    @abstractmethod
    async def execute(self, intent: Intent) -> ActionResult:
        """Execute the action based on the classified intent"""
        pass
    
    @abstractmethod
    def can_handle(self, intent_type: IntentType) -> bool:
        """Check if this action can handle the given intent type"""
        pass


class ActionExecutor:
    """Executes actions based on classified intents"""
    
    def __init__(self, db: AsyncSession, user: User):
        self.db = db
        self.user = user
        self.actions: List[BaseAction] = []
        self._register_actions()
    
    def _register_actions(self):
        """Register all available actions"""
        # Import and register action classes
        from app.core.intent_system.actions.memory_actions import MemoryActions
        from app.core.intent_system.actions.task_actions import TaskActions
        from app.core.intent_system.actions.resource_actions import ResourceActions
        from app.core.intent_system.actions.idea_actions import IdeaActions
        from app.core.intent_system.actions.study_actions import StudyActions
        from app.core.intent_system.actions.career_actions import CareerActions
        from app.core.intent_system.actions.productivity_actions import ProductivityActions
        
        self.actions = [
            MemoryActions(self.db, self.user),
            TaskActions(self.db, self.user),
            ResourceActions(self.db, self.user),
            IdeaActions(self.db, self.user),
            StudyActions(self.db, self.user),
            CareerActions(self.db, self.user),
            ProductivityActions(self.db, self.user),
        ]
    
    async def execute(self, intent: Intent) -> ActionResult:
        """Execute the appropriate action for the given intent"""
        # Find the action that can handle this intent
        for action in self.actions:
            if action.can_handle(intent.intent_type):
                try:
                    return await action.execute(intent)
                except Exception as e:
                    return ActionResult(
                        success=False,
                        message=f"Error executing action: {str(e)}",
                        data={"intent": intent.intent_type}
                    )
        
        return ActionResult(
            success=False,
            message=f"No action handler found for intent: {intent.intent_type}",
            data={"intent": intent.intent_type}
        )
    
    def get_available_intents(self) -> List[IntentType]:
        """Get all intent types that can be handled"""
        intent_types = []
        for action in self.actions:
            # This would need to be implemented in each action class
            pass
        return list(IntentType)
