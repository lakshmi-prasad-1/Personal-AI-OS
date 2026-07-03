from typing import Dict, List, Optional
from app.integrations.base import BaseIntegration, IntegrationConfig, IntegrationResult
from app.integrations.n8n_integration import N8nIntegration
from app.integrations.telegram_integration import TelegramIntegration
from app.integrations.calendar_integration import CalendarIntegration
from app.integrations.email_integration import EmailIntegration
from app.integrations.job_integration import JobIntegration


class IntegrationManager:
    """Manages all external integrations"""
    
    def __init__(self):
        self.integrations: Dict[str, BaseIntegration] = {}
        self._register_default_integrations()
    
    def _register_default_integrations(self):
        """Register default integration interfaces"""
        self.integrations = {
            "n8n": N8nIntegration(IntegrationConfig(enabled=False)),
            "telegram": TelegramIntegration(IntegrationConfig(enabled=False)),
            "google_calendar": CalendarIntegration(IntegrationConfig(enabled=False)),
            "gmail": EmailIntegration(IntegrationConfig(enabled=False)),
            "linkedin": JobIntegration(IntegrationConfig(enabled=False, settings={"platform": "linkedin"})),
            "indeed": JobIntegration(IntegrationConfig(enabled=False, settings={"platform": "indeed"})),
            "internshala": JobIntegration(IntegrationConfig(enabled=False, settings={"platform": "internshala"})),
            "wellfound": JobIntegration(IntegrationConfig(enabled=False, settings={"platform": "wellfound"})),
            "google_careers": JobIntegration(IntegrationConfig(enabled=False, settings={"platform": "google"})),
            "amazon_careers": JobIntegration(IntegrationConfig(enabled=False, settings={"platform": "amazon"})),
        }
    
    def get_integration(self, name: str) -> Optional[BaseIntegration]:
        """Get a specific integration by name"""
        return self.integrations.get(name)
    
    def list_integrations(self) -> List[str]:
        """List all available integrations"""
        return list(self.integrations.keys())
    
    def get_enabled_integrations(self) -> List[str]:
        """List all enabled integrations"""
        return [name for name, integration in self.integrations.items() if integration.is_enabled()]
    
    async def enable_integration(self, name: str, config: IntegrationConfig) -> IntegrationResult:
        """Enable and configure an integration"""
        integration = self.integrations.get(name)
        if not integration:
            return IntegrationResult(
                success=False,
                message=f"Integration {name} not found",
                error="Integration not found"
            )
        
        # Update configuration
        integration.config = config
        integration.enabled = True
        
        # Test connection
        test_result = await integration.test_connection()
        
        if test_result.success:
            return IntegrationResult(
                success=True,
                message=f"Integration {name} enabled successfully",
                data={"capabilities": integration.get_capabilities()}
            )
        else:
            return IntegrationResult(
                success=False,
                message=f"Failed to enable {name}: {test_result.message}",
                error=test_result.error
            )
    
    async def disable_integration(self, name: str) -> IntegrationResult:
        """Disable an integration"""
        integration = self.integrations.get(name)
        if not integration:
            return IntegrationResult(
                success=False,
                message=f"Integration {name} not found",
                error="Integration not found"
            )
        
        integration.enabled = False
        await integration.disconnect()
        
        return IntegrationResult(
            success=True,
            message=f"Integration {name} disabled"
        )
    
    def get_integration_capabilities(self, name: str) -> Optional[List[str]]:
        """Get capabilities of a specific integration"""
        integration = self.integrations.get(name)
        if integration:
            return integration.get_capabilities()
        return None
    
    async def execute_integration_action(self, integration_name: str, action: str, data: dict) -> IntegrationResult:
        """Execute an action on an integration"""
        integration = self.integrations.get(integration_name)
        if not integration or not integration.is_enabled():
            return IntegrationResult(
                success=False,
                message=f"Integration {integration_name} not found or not enabled",
                error="Integration unavailable"
            )
        
        # Route to appropriate method based on action
        try:
            if integration_name == "n8n" and action == "trigger_workflow":
                return await integration.trigger_workflow(data.get("workflow_id"), data)
            elif integration_name == "telegram" and action == "send_message":
                return await integration.send_message(data.get("message"))
            elif integration_name == "telegram" and action == "send_notification":
                return await integration.send_notification(data)
            elif integration_name == "google_calendar" and action == "create_event":
                return await integration.create_event(data)
            elif integration_name == "google_calendar" and action == "sync_schedule":
                return await integration.sync_schedule(data)
            elif integration_name == "gmail" and action == "send_email":
                return await integration.send_email(data)
            elif integration_name == "gmail" and action == "search_emails":
                return await integration.search_emails(data.get("query"))
            elif "career" in integration_name or "job" in integration_name:
                if action == "search_jobs":
                    return await integration.search_jobs(data)
                elif action == "track_application":
                    return await integration.track_application(data)
            
            return IntegrationResult(
                success=False,
                message=f"Action {action} not implemented for {integration_name}",
                error="Action not implemented"
            )
        except Exception as e:
            return IntegrationResult(
                success=False,
                message=f"Error executing action: {str(e)}",
                error=str(e)
            )
