import anthropic
import json
from app.core.supabase import supabase
from app.core.config import settings

_anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)

DRAFT_BUDGET = 50000


def generate_entities(tournament_id: str):
    tourney_res = supabase.table("tournaments").select("*").eq("id", tournament_id).execute()
    if not tourney_res.data:
        return None, "Tournament not found"
    tourney = tourney_res.data[0]
    theme = tourney.get("theme") or tourney.get("name")

    members_res = supabase.table("league_members").select("user_id").eq("league_id", tourney["league_id"]).execute()
    member_count = len(members_res.data)
    entity_count = max(24, member_count * 2)

    prompt = f"""You are generating a fantasy draft pool for a tournament themed: "{theme}".

Generate exactly {entity_count} draftable entities (teams, athletes, players, or competitors relevant to the theme).
Each entity has a salary-cap price between 3000 and 15000 (total budget per user is {DRAFT_BUDGET}).
Prices should reflect relative strength — top entities cost more.

Respond with ONLY a JSON array, no extra text:
[
  {{"name": "Entity Name", "entity_type": "team|player|athlete", "price": 8000, "stats": {{"key": "value"}}}},
  ...
]"""

    msg = _anthropic.messages.create(
        model="claude-opus-4-7",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = msg.content[0].text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    entities = json.loads(raw)

    rows = [{"tournament_id": tournament_id, **e} for e in entities]
    res = supabase.table("tournament_entities").insert(rows).execute()
    supabase.table("tournaments").update({"status": "drafting"}).eq("id", tournament_id).execute()
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
