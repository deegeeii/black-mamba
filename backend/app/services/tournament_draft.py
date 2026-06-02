import asyncio
import anthropic
import json
from app.core.supabase import supabase
from app.core.config import settings
from datetime import datetime


_anthropic = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=120.0)

DRAFT_BUDGET = 50000


async def _ai_with_search(prompt: str, max_tokens: int = 4096) -> str:
    try:
        msg = await _anthropic.messages.create(
            model="claude-opus-4-7",
            max_tokens=max_tokens,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(block.text for block in msg.content if hasattr(block, "text"))
    except Exception:
        msg = await _anthropic.messages.create(
            model="claude-opus-4-7",
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text


async def generate_entities(tournament_id: str, draft_start_time: datetime):
    tourney_res = supabase.table("tournaments").select("*").eq("id", tournament_id).execute()
    if not tourney_res.data:
        return None, "Tournament not found"
    tourney = tourney_res.data[0]

    theme = tourney.get("theme") or tourney.get("name")
    entity_type = tourney.get("entity_type") or "auto-detect"
    budget = tourney.get("draft_budget") or DRAFT_BUDGET

    members_res = supabase.table("league_members").select("user_id").eq("league_id", tourney["league_id"]).execute()
    member_count = len(members_res.data)
    entity_count = max(24, member_count * 2)

    prompt = f"""You are generating a fantasy draft pool. Search the web for current information about this event.

Event/Theme: "{theme}"
Entity type to draft: {entity_type} (if "auto-detect", determine what makes most sense — countries for Olympics, players for soccer leagues, teams for March Madness, etc.)
Budget per user: ${budget:,}
Entities needed: exactly {entity_count}

Search for the current real participants in this event, their rankings and recent results.
Price top performers 12000–15000, mid-tier 6000–10000, underdogs 3000–5000.
Use real names of actual current participants.

Return ONLY a valid JSON array (no markdown):
[
  {{"name": "Real Name", "entity_type": "country|player|team|athlete", "price": 9000, "stats": {{"ranking": "...", "recent_form": "..."}}}},
  ...
]"""

    raw = await _ai_with_search(prompt, max_tokens=4096)

    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    start = raw.find("[")
    end = raw.rfind("]") + 1
    if start == -1 or end == 0:
        return None, "Failed to generate entity pool"
    entities = json.loads(raw[start:end])

    rows = [{"tournament_id": tournament_id, **e} for e in entities]
    res = supabase.table("tournament_entities").insert(rows).execute()

    draft_start_str = draft_start_time.strftime("%b %d at %I:%M %p UTC")
    supabase.table("tournaments").update({
        "status": "drafting",
        "draft_start_time": draft_start_time.isoformat(),
    }).eq("id", tournament_id).execute()

    from app.services.notification import create_notification
    tournament_members = supabase.table("tournament_members").select("user_id").eq("tournament_id", tournament_id).execute()
    await asyncio.gather(*[
        asyncio.to_thread(
            create_notification,
            m["user_id"],
            tourney["league_id"],
            "tournament_draft",
            f"Draft for '{tourney['name']}' starts {draft_start_str}. Get ready to pick!"
        )
        for m in tournament_members.data
    ])

    return res.data, None


def get_entities(tournament_id: str):
    entities_res = supabase.table("tournament_entities").select("*").eq("tournament_id", tournament_id).order("price", desc=True).execute()
    picks_res = supabase.table("tournament_draft_picks").select("entity_id, user_id").eq("tournament_id", tournament_id).execute()
    picked = {p["entity_id"]: p["user_id"] for p in picks_res.data}
    for e in entities_res.data:
        e["picked_by"] = picked.get(e["id"])
    return entities_res.data


def make_pick(tournament_id: str, entity_id: str, user_id: str):
    tourney_res = supabase.table("tournaments").select("draft_budget").eq("id", tournament_id).execute()
    if not tourney_res.data:
        return None, "Tournament not found"
    budget = tourney_res.data[0]["draft_budget"] or DRAFT_BUDGET

    entity_res = supabase.table("tournament_entities").select("*").eq("id", entity_id).execute()
    if not entity_res.data:
        return None, "Entity not found"
    entity = entity_res.data[0]

    existing_pick = supabase.table("tournament_draft_picks").select("id").eq("tournament_id", tournament_id).eq("entity_id", entity_id).execute()
    if existing_pick.data:
        return None, "Already picked"

    my_picks = supabase.table("tournament_draft_picks").select("entity_id").eq("tournament_id", tournament_id).eq("user_id", user_id).execute()
    my_entity_ids = [p["entity_id"] for p in my_picks.data]
    if my_entity_ids:
        spent_res = supabase.table("tournament_entities").select("price").in_("id", my_entity_ids).execute()
        spent = sum(e["price"] for e in spent_res.data)
    else:
        spent = 0

    if spent + entity["price"] > budget:
        return None, f"Over budget (remaining: {budget - spent})"

    res = supabase.table("tournament_draft_picks").insert({
        "tournament_id": tournament_id,
        "entity_id": entity_id,
        "user_id": user_id,
    }).execute()
    return res.data[0], None
