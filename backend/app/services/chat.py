import anthropic
from app.core.config import settings
from app.core.supabase import supabase
from app.services.notification import create_notification


client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


PERSONAS = {
    "commissioner": {
        "name": "Commissioner Bot",
        "prompt": """You are the AI Commissioner of a fantasy football league.
You post updates in a TV analyst style — confident, opinionated, a little trash-talky.
Think Stephen A. Smith meets fantasy football expert.
Read the recent chat messages and mirror the energy of the conversation.
Keep it under 3 sentences. No hashtags. No emojis."""
    },
    "funny": {
        "name": "Hype Bot",
        "prompt": """You are a chaotic, hilarious fantasy football hype bot.
You roast managers relentlessly, make absurd comparisons, and celebrate wins like a hype man.
Think Kevin Hart meets Bill Simmons.
Read the recent chat — pick up on slang, nicknames, and ongoing beef and use it in your response.
Keep it under 3 sentences. 1-2 emojis max. No hashtags."""
    },
    "anime": {
    "name": "Sensei Bot",
    "prompt": """You are a wise, imposing fantasy football sensei. You speak with the calm authority of All Might at his peak, the ruthless honor of Zoro — no excuses, no shortcuts, only results — and the cold pride of Vegeta, Prince of All Saiyans, who respects power and tolerates weakness with contempt.

You do not use slang. You deliver verdicts. A struggling manager is not "cooked" — they have dishonored their bloodline. A dominant week is not "fire" — it is the natural order of a true prince asserting dominance.

Reference DBZ, One Piece, and My Hero Academia only. Think: "I am the prince of all Saiyans — I do not lose to a man who starts a kicker." or "Zoro got lost for three days and still found the king. Your running back has been injured for three weeks. Pathetic."

Read the recent chat and factor in what the league is talking about.
Keep it under 3 sentences. No hashtags. 1 emoji max, only if it fits the gravity."""
},

}


def _ai(system: str, prompt: str) -> str:
    msg = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=512,
        system=system,
        messages=[{"role": "user", "content": prompt}]
    )
    return msg.content[0].text.strip()


def get_messages(league_id: str):
    res = supabase.table("league_messages") \
        .select("*") \
        .eq("league_id", league_id) \
        .order("created_at", desc=True) \
        .limit(100) \
        .execute()
    return list(reversed(res.data or [])), None


def post_message(league_id: str, user_id: str, message: str):
    res = supabase.table("league_messages").insert({
        "league_id": league_id,
        "user_id": user_id,
        "message": message,
        "is_bot": False
    }).execute()

    members_res = supabase.table("league_members") \
        .select("user_id") \
        .eq("league_id", league_id) \
        .neq("user_id", user_id) \
        .execute()

    preview = message[:80] + ("..." if len(message) > 80 else "")
    for member in (members_res.data or []):
        try:
            create_notification(
                member["user_id"],
                league_id,
                "chat_message",
                preview,
            )
        except Exception as e:
            print(f"[chat] notification error for {member['user_id']}: {e}")


    return res.data[0] if res.data else None, None



def _get_recent_chat(league_id: str, limit: int = 10) -> str:
    res = supabase.table("league_messages") \
        .select("message, is_bot") \
        .eq("league_id", league_id) \
        .eq("is_bot", False) \
        .order("created_at", desc=True) \
        .limit(limit) \
        .execute()
    messages = list(reversed(res.data or []))
    if not messages:
        return "No recent chat activity."
    return "\n".join(f"- {m['message']}" for m in messages)


def bot_post(league_id: str, trigger: str, context: str):
    league_res = supabase.table("leagues") \
        .select("bot_persona") \
        .eq("id", league_id) \
        .execute()
    persona_key = "commissioner"
    if league_res.data:
        persona_key = league_res.data[0].get("bot_persona") or "commissioner"

    persona = PERSONAS.get(persona_key, PERSONAS["commissioner"])
    recent_chat = _get_recent_chat(league_id)

    prompt = f"""Recent league chat:
{recent_chat}

Trigger: {trigger}
Context: {context}

Respond in character:"""

    message = _ai(persona["prompt"], prompt)

    res = supabase.table("league_messages").insert({
        "league_id": league_id,
        "user_id": None,
        "message": message,
        "is_bot": True,
        "bot_name": persona["name"],
        "bot_trigger": trigger
    }).execute()
    return res.data[0] if res.data else None, None


def delete_message(message_id: str, user_id: str):
    res = supabase.table("league_messages").select("user_id, is_bot").eq("id", message_id).execute()
    if not res.data:
        return None, "Message not found"
    msg = res.data[0]
    if msg["is_bot"] or msg["user_id"] != user_id:
        return None, "You can only delete your own messages"
    supabase.table("league_messages").delete().eq("id", message_id).execute()
    return {"deleted": True}, None
