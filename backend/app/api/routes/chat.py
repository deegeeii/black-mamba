from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user_id as get_current_user
from app.services.chat import get_messages, post_message, bot_post

router = APIRouter(prefix="/leagues", tags=["chat"])

class MessageRequest(BaseModel):
    message: str

class BotRequest(BaseModel):
    trigger: str
    context: str

@router.get("/{league_id}/chat")
def fetch_messages(league_id: str, user_id: str = Depends(get_current_user)):
    messages, err = get_messages(league_id)
    if err:
        return {"error": err}
    return messages

@router.post("/{league_id}/chat")
def send_message(league_id: str, body: MessageRequest, user_id: str = Depends(get_current_user)):
    msg, err = post_message(league_id, user_id, body.message)
    if err:
        return {"error": err}
    return msg

@router.post("/{league_id}/chat/bot")
def trigger_bot(league_id: str, body: BotRequest, user_id: str = Depends(get_current_user)):
    msg, err = bot_post(league_id, body.trigger, body.context)
    if err:
        return {"error": err}
    return msg
