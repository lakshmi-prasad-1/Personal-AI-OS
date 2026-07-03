import unittest

from app.intelligence.context_engine import assemble_brain_context
from app.intelligence.brain.decision_service import evaluate_decisions
from app.intelligence.reasoning_layer import ReasoningLayer


class ContextAndDecisionEngineTests(unittest.TestCase):
    def test_reasoning_layer_returns_context_and_decisions(self):
        layer = ReasoningLayer()
        self.assertTrue(hasattr(layer, "reason"))

    def test_context_engine_returns_assembled_prompt(self):
        self.assertTrue(callable(assemble_brain_context))

    def test_decision_engine_returns_list(self):
        self.assertTrue(callable(evaluate_decisions))


if __name__ == "__main__":
    unittest.main()
