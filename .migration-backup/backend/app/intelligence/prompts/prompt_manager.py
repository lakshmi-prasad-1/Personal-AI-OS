import os
from pathlib import Path
from typing import Dict, Any

class PromptManager:
    """
    Dynamically loads prompt templates from the templates directory.
    Prevents hardcoded prompts in business logic.
    """
    def __init__(self, templates_dir: str = None):
        if templates_dir is None:
            # Default to the templates folder in the current directory
            current_dir = Path(__file__).parent
            self.templates_dir = current_dir / "templates"
        else:
            self.templates_dir = Path(templates_dir)

    def get_prompt(self, template_name: str, **kwargs: Dict[str, Any]) -> str:
        """
        Loads a prompt template and formats it with the provided kwargs.
        """
        file_path = self.templates_dir / f"{template_name}.txt"
        
        if not file_path.exists():
            raise FileNotFoundError(f"Prompt template {template_name}.txt not found.")
            
        with open(file_path, "r", encoding="utf-8") as f:
            template = f.read()
            
        try:
            return template.format(**kwargs)
        except KeyError as e:
            raise ValueError(f"Missing required parameter for prompt template '{template_name}': {str(e)}")

# Singleton instance
prompt_manager = PromptManager()
