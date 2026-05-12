import anthropic
from app.core.config import settings
from app.core.supabase import supabase

client = anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _ai(prompt: str) -> str:
    msg = client.messages.create(
        model="claude-opus-4-7",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}]
    )
    return msg.content[0].text.strip()


def get_messages(league_id: str):
    res = supabase.table("league_messages") \
        .select("*") \
        .eq("league_id", league_id) \
        .order("created_at", desc=False) \
        .limit(50) \
        .execute()
    return res.data or [], None


def post_message(league_id: str, user_id: str, message: str):
    res = supabase.table("league_messages").insert({
        "league_id": league_id,
        "user_id": user_id,
        "message": message,
        "is_bot": False
    }).execute()
    return res.data[0] if res.data else None, None


def bot_post(league_id: str, trigger: str, context: str):
    prompt = f"""You are the AI Commissioner of a fantasy football league.
You post updates in a TV analyst style - confident, opinionated, a little trash-talky.
Think Stephen A. Smith meets fantasy football expert.
Keep it under 3 sentences. No hashtags. No emojis. 

Trigger: {trigger}
Context: {context}

Post your comissioner update:"""
    
    message = _ai(prompt)

    res = supabase.table("league_messages").insert({
        "league_id": league_id,
        "user_id": None,
        "message": message,
        "is_bot": True,
        "bot_trigger": trigger
    }).execute()
    return res.data[0] if res.data else None, None
