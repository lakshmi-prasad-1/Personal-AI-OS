import unittest

from app.intelligence.global_intelligence.event_bus import EventBus, Event
from app.intelligence.global_intelligence.decision_engine_v2 import DecisionEngineV2
from app.intelligence.global_intelligence.recommendation_engine import RecommendationEngine
from app.intelligence.global_intelligence.prediction_engine import PredictionEngine
from app.intelligence.global_intelligence.mastery_engine import MasteryEngine
from app.intelligence.global_intelligence.timeline_engine import TimelineEngine
from app.intelligence.global_intelligence.opportunity_engine import OpportunityEngine
from app.intelligence.global_intelligence.conflict_engine import ConflictEngine
from app.intelligence.global_intelligence.orchestrator import GlobalIntelligenceOrchestrator


class GlobalIntelligenceTests(unittest.TestCase):
    def test_event_bus_delivers_messages_to_subscribers(self):
        bus = EventBus()
        received = []

        def handler(event):
            received.append(event.type)

        bus.subscribe("GoalCreated", handler)
        bus.publish(Event("GoalCreated", {"goal": "Backend Engineer"}))

        self.assertEqual(received, ["GoalCreated"])

    def test_decision_engine_v2_prioritizes_recommendations(self):
        engine = DecisionEngineV2()
        decision = engine.reason({"goals": ["Backend Engineer"], "tasks": [{"title": "Study Docker"}]})

        self.assertIn("recommendations", decision)
        self.assertGreaterEqual(len(decision["recommendations"]), 1)

    def test_recommendation_engine_builds_reasoned_recommendation(self):
        engine = RecommendationEngine()
        recommendation = engine.recommend("career", {"goal": "Backend Engineer"})

        self.assertEqual(recommendation["category"], "career")
        self.assertIn("reason", recommendation)

    def test_prediction_engine_estimates_completion(self):
        engine = PredictionEngine()
        prediction = engine.predict({"current_completion": 0.3, "pace_per_day": 0.1})

        self.assertGreaterEqual(prediction["estimated_completion_days"], 1)

    def test_mastery_engine_updates_mastery_scores(self):
        engine = MasteryEngine()
        mastery = engine.update_mastery({"React": 0.8}, {"React": 0.3})

        self.assertGreaterEqual(mastery["React"], 0.8)

    def test_timeline_engine_records_event(self):
        engine = TimelineEngine()
        timeline = engine.add_event("goal", "Completed React project", {"source": "study"})

        self.assertEqual(timeline[-1]["event_type"], "goal")

    def test_opportunity_engine_detects_resource_matches(self):
        engine = OpportunityEngine()
        opportunities = engine.detect_opportunities({"weak_topics": ["Docker"], "resources": ["Docker course"]})

        self.assertGreaterEqual(len(opportunities), 1)

    def test_conflict_engine_detects_conflicting_priorities(self):
        engine = ConflictEngine()
        conflicts = engine.detect_conflicts({"exam": 1, "interview": 1, "assignment": 1})

        self.assertGreaterEqual(len(conflicts), 1)

    def test_orchestrator_generates_cross_module_snapshot(self):
        orchestrator = GlobalIntelligenceOrchestrator()
        snapshot = orchestrator.build_snapshot({"goals": ["Backend Engineer"], "weak_topics": ["Docker"]})

        self.assertIn("recommendations", snapshot)
        self.assertIn("insights", snapshot)
        self.assertIn("predictions", snapshot)


if __name__ == "__main__":
    unittest.main()
