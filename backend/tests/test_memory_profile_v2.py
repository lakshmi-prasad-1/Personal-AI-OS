import unittest

from app.intelligence.memory_classifier import MemoryClassifier
from app.intelligence.entity_extractor import EntityExtractor
from app.intelligence.profile_engine import ProfileEngine
from app.intelligence.timeline_engine import TimelineEngine
from app.intelligence.memory_linker import MemoryLinker
from app.intelligence.knowledge_graph import build_graph_from_entities


class MemoryProfileV2Tests(unittest.TestCase):
    def test_profile_engine_updates_profile_from_memory(self):
        engine = ProfileEngine()
        profile = {"skills": [], "goals": [], "career_interests": []}
        engine.update_profile_from_memory(profile, {
            "title": "Learn Docker",
            "description": "I am learning Docker for my internship",
            "category": "Skills",
            "confidence_score": 0.82,
        })
        engine.update_profile_from_memory(profile, {
            "title": "Get a software internship",
            "description": "I want a software internship",
            "category": "Goals",
            "confidence_score": 0.9,
        })

        self.assertEqual(profile["skills"][0]["name"], "Docker")
        self.assertEqual(profile["goals"][0]["title"], "Get a software internship")
        self.assertIn("software internship", profile["career_interests"])

    def test_memory_classifier_classifies_learning_and_goal_text(self):
        classifier = MemoryClassifier()
        skill_item = classifier.classify("I am learning Docker for my future career")
        goal_item = classifier.classify("I want to get an internship by August")

        self.assertEqual(skill_item["category"], "Skill")
        self.assertEqual(goal_item["category"], "Goal")
        self.assertGreater(skill_item["importance"], 0)

    def test_entity_extractor_extracts_structured_entities(self):
        extractor = EntityExtractor()
        entities = extractor.extract("I am learning Docker and applying to Microsoft for my internship")

        self.assertTrue(any(e["type"] == "Technology" for e in entities))
        self.assertTrue(any(e["type"] == "Company" for e in entities))
        self.assertTrue(any(e["type"] == "Goal" for e in entities))

    def test_timeline_engine_builds_chronological_progress(self):
        engine = TimelineEngine()
        events = engine.build_timeline([
            {"title": "Started React", "created_at": "2026-06-01"},
            {"title": "Completed React", "created_at": "2026-06-10"},
            {"title": "Applied internship", "created_at": "2026-06-15"},
        ])

        self.assertEqual(events[0]["title"], "Started React")
        self.assertEqual(len(events), 3)

    def test_memory_linker_creates_relationships_between_related_memories(self):
        linker = MemoryLinker()
        memories = [
            {"id": "1", "title": "Learning Docker", "tags": ["docker", "containerization"]},
            {"id": "2", "title": "Docker notes", "tags": ["docker", "notes"]},
            {"id": "3", "title": "Plan for internship", "tags": ["internship"]},
        ]

        relationships = linker.link(memories)
        self.assertTrue(any(r["source"] == "1" and r["target"] == "2" for r in relationships))

    def test_build_graph_from_entities_creates_relationships(self):
        nodes = [
            {"id": "memory-1", "entity_type": "Memory", "label": "Learning Docker"},
            {"id": "skill-1", "entity_type": "Skill", "label": "Docker"},
        ]
        edges = [{"source": "memory-1", "target": "skill-1", "relationship_type": "LEARNS"}]

        graph = build_graph_from_entities(nodes, edges)
        self.assertEqual(graph["nodes"][0]["entity_type"], "Memory")
        self.assertEqual(graph["edges"][0]["relationship_type"], "LEARNS")
