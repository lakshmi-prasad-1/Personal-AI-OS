from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from pydantic import BaseModel


class IntegrationConfig(BaseModel):
    """Base configuration for integrations"""
    enabled: bool = False
    api_key: Optional[str] = None
    webhook_url: Optional[str] = None
    settings: Dict[str, Any] = {}


class IntegrationResult(BaseModel):
    """Result from an integration operation"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class BaseIntegration(ABC):
    """Base class for all integrations"""
    
    def __init__(self, config: IntegrationConfig):
        self.config = config
        self.enabled = config.enabled
    
    @abstractmethod
    async def connect(self) -> IntegrationResult:
        """Establish connection to the integration service"""
        pass
    
    @abstractmethod
    async def disconnect(self) -> IntegrationResult:
        """Disconnect from the integration service"""
        pass
    
    @abstractmethod
    async def test_connection(self) -> IntegrationResult:
        """Test if the integration is working"""
        pass
    
    @abstractmethod
    def get_capabilities(self) -> List[str]:
        """Get list of capabilities this integration provides"""
        pass
    
    def is_enabled(self) -> bool:
        """Check if integration is enabled"""
        return self.enabled
