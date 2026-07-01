from typing import Any, Dict, List

from app.intelligence.global_intelligence.conflict_engine import ConflictEngine
from app.intelligence.global_intelligence.decision_engine_v2 import DecisionEngineV2
from app.intelligence.global_intelligence.mastery_engine import MasteryEngine
from app.intelligence.global_intelligence.opportunity_engine import OpportunityEngine
from app.intelligence.global_intelligence.prediction_engine import PredictionEngine
from app.intelligence.global_intelligence.recommendation_engine import RecommendationEngine
from app.intelligence.global_intelligence.timeline_engine import TimelineEngine


class GlobalIntelligenceOrchestrator:
    def __init__(self) -> None:
        self.decision_engine = DecisionEngineV2()
        self.recommendation_engine = RecommendationEngine()
        self.prediction_engine = PredictionEngine()
        self.mastery_engine = MasteryEngine()
        self.timeline_engine = TimelineEngine()
        self.opportunity_engine = OpportunityEngine()
        self.conflict_engine = ConflictEngine()

    def build_snapshot(self, context: Dict[str, Any]) -> Dict[str, Any]:
        decision = self.decision_engine.reason(context)
        recommendations = [
            self.recommendation_engine.recommend("career", context),
            self.recommendation_engine.recommend("study", context),
        ]
        predictions = [self.prediction_engine.predict({"current_completion": 0.3, "pace_per_day": 0.1})]
        insights = [
            {"type": "opportunity", "value": self.opportunity_engine.detect_opportunities(context)},
            {"type": "conflict", "value": self.conflict_engine.detect_conflicts({"exam": 1, "interview": 1, "assignment": 1})},
        ]
        self.timeline_engine.add_event("snapshot", "Generated global intelligence snapshot", {"context": context})
        return {
            "recommendations": recommendations,
            "insights": insights,
            "predictions": predictions,
            "decision": decision,
            "timeline": self.timeline_engine._events,
        }
