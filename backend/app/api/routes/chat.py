from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from app.core.security import get_current_user_id as get_current_user
from app.services.chat import get_messages, post_message, bot_post
from app.core.supabase import supabase


router = APIRouter(prefix="/leagues", tags=["chat"])


class MessageRequest(BaseModel):
    message: str


class BotRequest(BaseModel):
    trigger: str
    context: str


class PersonaUpdate(BaseModel):
    bot_persona: str


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

@router.patch("/{league_id}/bot-persona")
def update_bot_persona(league_id: str, body: PersonaUpdate, user_id: str = Depends(get_current_user)):
    from app.core.supabase import supabase
    valid = ["commissioner", "funny", "anime"]
    if body.bot_persona not in valid:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"Invalid persona. Choose from: {valid}")
    supabase.table("leagues").update({"bot_persona": body.bot_persona}).eq("id", league_id).execute()
    return {"ok": True}

@router.patch("/{league_id}/chat/read")
def mark_chat_read(
    league_id: str,
    user_id: str = Depends(get_current_user)
):
    from app.core.supabase import supabase
    from datetime import datetime, timezone
    supabase.table("league_members") \
        .update({"last_read_at": datetime.now(timezone.utc).isoformat()}) \
        .eq("league_id", league_id) \
        .eq("user_id", user_id) \
        .execute()
    return {"ok": True}


@router.get("/{league_id}/chat/unread-count")
def get_unread_count(
    league_id: str,
    user_id: str = Depends(get_current_user)
):
    from app.core.supabase import supabase
    member_res = supabase.table("league_members") \
        .select("last_read_at") \
        .eq("league_id", league_id) \
        .eq("user_id", user_id) \
        .execute()
    if not member_res.data:
        return {"count": 0}
    last_read = member_res.data[0].get("last_read_at")
    q = supabase.table("league_messages") \
        .select("id", count="exact") \
        .eq("league_id", league_id) \
        .neq("user_id", user_id) \
        .eq("is_bot", False)
    if last_read:
        q = q.gt("created_at", last_read)
    res = q.execute()
    return {"count": res.count or 0}
