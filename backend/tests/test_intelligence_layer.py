import unittest
from datetime import datetime, timedelta, timezone

from app.intelligence.decision_engine import Rule, RuleEngine
from app.intelligence.knowledge_graph import build_graph_from_entities
from app.intelligence.prompts.prompt_manager import prompt_manager
from app.intelligence.retrieval_pipeline import rank_retrieval_results
from app.intelligence.routing.llm_client import count_tokens


class IntelligenceLayerTests(unittest.TestCase):
    def test_count_tokens_returns_positive_value(self):
        self.assertGreater(count_tokens("The assistant should remember this detail."), 0)

    def test_prompt_manager_loads_prompt_template(self):
        prompt = prompt_manager.get_prompt("memory_extraction", user_input="I learned Docker today")
        self.assertIn("memory", prompt.lower())

    def test_rank_retrieval_results_blends_similarity_recency_and_importance(self):
        now = datetime(2026, 6, 30, tzinfo=timezone.utc)
        candidates = [
            {
                "id": "1",
                "title": "Docker course",
                "description": "A course about containerization",
                "similarity": 0.96,
                "importance_score": 0.9,
                "created_at": now - timedelta(days=1),
            },
            {
                "id": "2",
                "title": "Python notes",
                "description": "General python notes",
                "similarity": 0.92,
                "importance_score": 0.7,
                "created_at": now - timedelta(days=10),
            },
        ]

        ranked = rank_retrieval_results(candidates, query="docker", now_at=now)
        self.assertEqual(ranked[0]["id"], "1")
        self.assertGreater(ranked[0]["relevance_score"], ranked[1]["relevance_score"])

    def test_rule_engine_executes_matching_rule(self):
        engine = RuleEngine()
        engine.register_rule(
            Rule(
                name="schedule_docker_learning",
                description="Schedule learning when Docker is mentioned",
                condition=lambda context: "docker" in context.get("keywords", []),
                action=lambda context: {"action": "schedule_learning", "topic": context["topic"]},
            )
        )

        actions = engine.evaluate("docker", context={"keywords": ["docker"], "topic": "docker"})
        self.assertEqual(actions[0]["action"], "schedule_learning")
        self.assertEqual(actions[0]["topic"], "docker")

    def test_build_graph_from_entities_creates_relationships(self):
        nodes = [
            {"id": "resource-1", "entity_type": "Resource", "label": "Docker course"},
            {"id": "skill-1", "entity_type": "Skill", "label": "Docker"},
        ]
        edges = [
            {"source": "resource-1", "target": "skill-1", "relationship_type": "TEACHES"},
        ]

        graph = build_graph_from_entities(nodes, edges)
        self.assertEqual(graph["nodes"][0]["entity_type"], "Resource")
        self.assertEqual(graph["edges"][0]["relationship_type"], "TEACHES")


if __name__ == "__main__":
    unittest.main()
