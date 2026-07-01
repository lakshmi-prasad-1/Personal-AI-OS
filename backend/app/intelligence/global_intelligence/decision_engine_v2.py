from typing import Any, Dict, List


class DecisionEngineV2:
    def reason(self, context: Dict[str, Any]) -> Dict[str, Any]:
        recommendations: List[Dict[str, Any]] = []
        goals = context.get("goals", []) or []
        tasks = context.get("tasks", []) or []

        if goals:
            recommendations.append({
                "priority": "high",
                "action": f"Focus on {goals[0]}",
                "reason": "This aligns with the most important personal objective.",
            })

        if tasks:
            recommendations.append({
                "priority": "medium",
                "action": f"Schedule {tasks[0].get('title', 'the next task')}",
                "reason": "A concrete next action keeps momentum going.",
            })

        return {"recommendations": recommendations, "context": context}
