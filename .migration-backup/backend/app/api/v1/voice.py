from typing import Annotated, Any, Dict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user
from app.core.database import get_db
from app.intelligence.voice.voice_interface import build_voice_command, voice_to_brain_request
from app.models.core_models import User

router = APIRouter()


@router.post("/command")
async def handle_voice_command(
    payload: Dict[str, Any],
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: AsyncSession = Depends(get_db),
):
    """Create a normalized voice-command payload for brain routing."""
    command_text = payload.get("text", "")
    module = payload.get("module", "chat")
    command = build_voice_command(command_text, module)
    command["brain_request"] = voice_to_brain_request(command)
    return command
