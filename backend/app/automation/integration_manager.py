from typing import Any, Dict, List


class IntegrationManager:
    def __init__(self) -> None:
        self.providers: Dict[str, Dict[str, Any]] = {}

    def register_provider(self, name: str, provider: Dict[str, Any]) -> None:
        self.providers[name] = provider

    def health(self) -> Dict[str, Any]:
        return {name: provider.get("health", "unknown") for name, provider in self.providers.items()}

    def sync(self, provider_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        provider = self.providers.get(provider_name, {})
        return {"provider": provider_name, "status": "synced", "payload": payload}
