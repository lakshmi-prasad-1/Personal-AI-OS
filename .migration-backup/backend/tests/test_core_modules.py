import unittest

from app.intelligence.semantic_search import placeholder_similarity_service
from app.intelligence.voice.voice_interface import build_voice_command


class CoreModulesTests(unittest.TestCase):
    def test_placeholder_similarity_service_returns_ranked_results(self):
        results = placeholder_similarity_service("project planning", ["meeting notes", "budget tracker", "project plan"])

        self.assertEqual(len(results), 3)
        self.assertTrue(all("score" in item for item in results))
        self.assertTrue(results[0]["text"].lower().startswith("project"))
        self.assertGreaterEqual(results[0]["score"], results[-1]["score"])

    def test_build_voice_command_creates_action_payload(self):
        command = build_voice_command("open my notes", module="notes")

        self.assertEqual(command["module"], "notes")
        self.assertEqual(command["action"], "open")
        self.assertIn("query", command["payload"])
        self.assertEqual(command["payload"]["query"], "my notes")


if __name__ == "__main__":
    unittest.main()
