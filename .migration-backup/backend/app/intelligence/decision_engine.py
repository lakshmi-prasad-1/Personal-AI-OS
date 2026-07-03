from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional


@dataclass
class Rule:
    name: str
    description: str
    condition: Callable[[Dict[str, Any]], bool]
    action: Callable[[Dict[str, Any]], Dict[str, Any]]


class RuleEngine:
    """A small modular rule engine for lightweight workflow automation."""

    def __init__(self) -> None:
        self._rules: List[Rule] = []

    def register_rule(self, rule: Rule) -> None:
        self._rules.append(rule)

    def evaluate(self, event: Any, context: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        resolved_context = context or {}
        actions: List[Dict[str, Any]] = []
        for rule in self._rules:
            if rule.condition(resolved_context):
                actions.append(rule.action(resolved_context))
        return actions
