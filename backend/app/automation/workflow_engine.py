from typing import Any, Dict, List


class WorkflowEngine:
    def __init__(self) -> None:
        self.history: List[Dict[str, Any]] = []

    def execute_workflow(self, workflow: Dict[str, Any], context: Dict[str, Any] | None = None) -> Dict[str, Any]:
        context = context or {}
        steps = workflow.get("steps", [])
        executed_steps = []
        for step in steps:
            executed_steps.append(step.get("action", "noop"))

        entry = {
            "workflow_name": workflow.get("name", "unnamed"),
            "status": "success",
            "trigger_type": workflow.get("trigger_type", "manual"),
            "steps": executed_steps,
            "context": context,
        }
        self.history.append(entry)
        return {"status": "success", "steps": executed_steps, "history_id": len(self.history) - 1}
