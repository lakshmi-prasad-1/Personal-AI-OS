from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.intent_system.action_executor import BaseAction, ActionResult
from app.core.intent_system.intent_classifier import Intent, IntentType
from app.models.core_models import User, Resource
from datetime import datetime
import uuid


class ResourceActions(BaseAction):
    """Actions related to resources and learning materials"""
    
    def can_handle(self, intent_type: IntentType) -> bool:
        return intent_type in [
            IntentType.STORE_RESOURCE,
            IntentType.RETRIEVE_RESOURCE,
            IntentType.SEARCH_RESOURCES
        ]
    
    async def execute(self, intent: Intent) -> ActionResult:
        if intent.intent_type == IntentType.STORE_RESOURCE:
            return await self._store_resource(intent)
        elif intent.intent_type == IntentType.RETRIEVE_RESOURCE:
            return await self._retrieve_resource(intent)
        elif intent.intent_type == IntentType.SEARCH_RESOURCES:
            return await self._search_resources(intent)
        
        return ActionResult(success=False, message="Unknown resource action")
    
    async def _store_resource(self, intent: Intent) -> ActionResult:
        """Store a resource from user input"""
        try:
            # Extract resource details
            resource_type = intent.entities.get("resource_type", "article")
            category = intent.entities.get("category", "general")
            title = self._extract_title(intent.raw_text)
            url = self._extract_url(intent.raw_text)
            
            resource = Resource(
                id=uuid.uuid4(),
                user_id=self.user.id,
                title=title,
                url=url,
                resource_type=resource_type,
                category=category,
                description=intent.raw_text,
                metadata=intent.entities,
                tags=self._extract_tags(intent.raw_text)
            )
            self.db.add(resource)
            await self.db.commit()
            
            return ActionResult(
                success=True,
                message=f"Resource saved under {category}: {title}",
                data={"resource_id": str(resource.id)}
            )
        except Exception as e:
            await self.db.rollback()
            return ActionResult(success=False, message=f"Failed to store resource: {str(e)}")
    
    async def _retrieve_resource(self, intent: Intent) -> ActionResult:
        """Retrieve a specific resource"""
        try:
            # For now, just return the most recent resource
            query = select(Resource).where(
                Resource.user_id == self.user.id
            ).order_by(Resource.created_at.desc()).limit(1)
            
            result = await self.db.execute(query)
            resource = result.scalar_one_or_none()
            
            if not resource:
                return ActionResult(success=True, message="No resources found.")
            
            return ActionResult(
                success=True,
                message=f"Latest resource: {resource.title}",
                data={"resource": {
                    "title": resource.title,
                    "url": resource.url,
                    "category": resource.category,
                    "type": resource.resource_type
                }}
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to retrieve resource: {str(e)}")
    
    async def _search_resources(self, intent: Intent) -> ActionResult:
        """Search resources based on criteria"""
        try:
            # Check for unfinished resources
            text_lower = intent.raw_text.lower()
            
            query = select(Resource).where(
                Resource.user_id == self.user.id
            )
            
            if "unfinished" in text_lower or "incomplete" in text_lower:
                query = query.where(Resource.is_completed == False)
            
            # Filter by topic if mentioned
            if "react" in text_lower:
                query = query.where(Resource.category.ilike("%react%"))
            elif "dsa" in text_lower:
                query = query.where(Resource.category.ilike("%dsa%"))
            
            result = await self.db.execute(query)
            resources = result.scalars().all()
            
            if not resources:
                return ActionResult(success=True, message="No matching resources found.")
            
            resource_list = [
                f"- {r.title} ({r.category}) - {'Completed' if r.is_completed else 'Incomplete'}"
                for r in resources
            ]
            
            return ActionResult(
                success=True,
                message=f"Found {len(resources)} resources:",
                data={"resources": resource_list}
            )
        except Exception as e:
            return ActionResult(success=False, message=f"Failed to search resources: {str(e)}")
    
    def _extract_title(self, text: str) -> str:
        """Extract resource title from text"""
        # Simple extraction - in production would use NLP
        text = text.lower()
        
        if "youtube" in text or "video" in text:
            return "YouTube Video"
        elif "article" in text or "blog" in text:
            return "Article"
        elif "course" in text:
            return "Course"
        
        return "Resource"
    
    def _extract_url(self, text: str) -> Optional[str]:
        """Extract URL from text"""
        # Simple URL extraction
        import re
        url_pattern = r'https?://[^\s]+'
        match = re.search(url_pattern, text)
        return match.group(0) if match else None
    
    def _extract_tags(self, text: str) -> list:
        """Extract tags from text"""
        tags = []
        text_lower = text.lower()
        
        if "react" in text_lower:
            tags.append("react")
        if "javascript" in text_lower:
            tags.append("javascript")
        if "python" in text_lower:
            tags.append("python")
        if "dsa" in text_lower:
            tags.append("dsa")
        if "tutorial" in text_lower:
            tags.append("tutorial")
        
        return tags
