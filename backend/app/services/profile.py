import anthropic
from app.core.config import settings
from app.core.supabase import supabase
from app.models.profile import ProfileUpdate

_anthropic = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=30.0)


async def _generate_team_name(identifier: str) -> str:
    msg = await _anthropic.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=30,
        messages=[{"role": "user", "content": f"Generate a fun, short fantasy sports team name for someone named {identifier}. Return ONLY the team name, nothing else."}],
    )
    return msg.content[0].text.strip()


async def get_profile(user_id: str):
    response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    profile = response.data
    if profile and not profile.get("team_name"):
        if profile.get("username"):
            team_name = f"{profile['username']}'s Team"
        else:
            try:
                user_data = supabase.auth.admin.get_user(user_id)
                email = user_data.user.email
                identifier = email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
            except Exception:
                identifier = "Champion"
            team_name = await _generate_team_name(identifier)
        supabase.table("profiles").update({"team_name": team_name}).eq("id", user_id).execute()
        profile["team_name"] = team_name
    return profile


def update_profile(user_id: str, updates: ProfileUpdate):
    data = {k: v for k, v in updates.model_dump().items() if v is not None}
    data["updated_at"] = "now()"
    response = (
        supabase.table("profiles")
        .update(data)
        .eq("id", user_id)
        .execute()
    )
    return response.data[0]
