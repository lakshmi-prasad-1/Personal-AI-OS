from typing import Any, Dict, List


class OpportunityEngine:
    def detect_opportunities(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        weak_topics = context.get("weak_topics", []) or []
        resources = context.get("resources", []) or []
        opportunities = []
        for topic in weak_topics:
            for resource in resources:
                if topic.lower() in str(resource).lower():
                    opportunities.append({"topic": topic, "resource": resource})
                    break
        return opportunities
