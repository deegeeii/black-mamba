import anthropic
import json
import random
from app.core.supabase import supabase
from app.core.config import settings

_anthropic = anthropic.Anthropic(api_key=settings.anthropic_api_key)

def _ai(prompt: str) -> str:
    msg = _anthropic.messages.create(
        model="claude-opus-4-7",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


def create_tournament(league_id: str, user_id: str, data):
    res = supabase.table("tournaments").insert({
        "league_id": league_id,
        "name": data.name,
        "theme": data.theme,
        "entry_fee": data.entry_fee,
    }).execute()
    return res.data[0], None

def list_tournaments(league_id: str):
    res = supabase.table("tournaments").select("*").eq("league_id", league_id).order("created_at", desc=True).execute()
    return res.data


def join_tournament(tournament_id: str, user_id: str):
    existing = supabase.table("tournament_members").select("id").eq("tournament_id", tournament_id).eq("user_id", user_id).execute()
    if existing.data:
        return None, "Already joined"
    draft_team_name = _generate_draft_name()
    res = supabase.table("tournament_members").insert({
        "tournament_id": tournament_id,
        "user_id": user_id,
        "paid": True,
        "draft_team_name": draft_team_name,
    }).execute()
    return res.data[0], None



def vote_ai_brain(tournament_id: str, user_id: str, vote: str):
    supabase.table("tournament_members").update({"ai_vote": vote}).eq("tournament_id", tournament_id).eq("user_id", user_id).execute()
    votes_res = supabase.table("tournament_members").select("ai_vote").eq("tournament_id", tournament_id).execute()
    votes = [r["ai_vote"] for r in votes_res.data if r["ai_vote"]]
    winner = max(set(votes), key=votes.count) if votes else "clauce"
    supabase.table("tournaments").update({"ai_brain": winner}).eq("id", tournament_id).execute()
    return {"ai_brain": winner}


def generate_bracket(tournament_id: str):
    tourney_res = supabase.table("tournaments").select("*").eq("id", tournament_id).execute()
    if not tourney_res.data:
        return None, "Tournament not found"
    tourney = tourney_res.data[0]

    members_res = supabase.table("tournament_members").select("user_id").eq("tournament_id", tournament_id).execute()
    user_ids = [r["user_id"] for r in members_res.data]
    if len(user_ids) < 2: 
        return None, "Need at least 2 members"
    
    random.shuffle(user_ids)
    if len(user_ids) % 2 !=0:
        user_ids.append(user_ids[0])  # bye handled as rematch

    matchups = []
    for i in range(0, len(user_ids), 2):
        matchups.append({
            "tournament_id": tournament_id,
            "round": 1,
            "home_user_id": user_ids[i],
            "away_user_id": user_ids[i + 1]
        })
    supabase.table("tournament_matchups").insert(matchups).execute()

    theme = tourney.get("theme") or "fantasy sports tournament"
    scoring_prompt = (
        f"You are designing scoring rules for a fantasy tournament themed around: {theme}. "
        "Create fun, event-specific bonus scoring rules on top of standard fantasy football scoring. "
        "Return ONLY a valid JSON object with keys: 'description' (string), 'bonuses', (array of objects with 'name' and 'points' keys). "
        "Example: {\"description\": \"...\", \"bonuses\": [{\"name\": \"TD in overtime\", \"points\": 3}]}"
    )
    raw = _ai(scoring_prompt)

def _generate_draft_name() -> str:
    try:
        msg = _anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=16,
            messages=[{
                "role": "user",
                "content": "Generate one creative fantasy sports team name. Return ONLY the name, nothing else. Be varied and inventive.",
            }],
        )
        return msg.content[0].text.strip().strip('"').strip("'")
    except Exception:
        return "Mystery Squad"

    try:
        # Extract JSON from response (handle markdown code blocks)
        if "```" in raw:
            raw = raw.spling("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        scoring_rules = json.loads(raw.strip())
    except Exception:
        scoring_rules = {"description": raw, "bonuses": []}

    supabase.table("tournaments").update({
        "scoring_rules": scoring_rules,
        "status": "active",
    }).eq("id", tournament_id).execute()

    return {"matchups": matchups, "scoring_rules": scoring_rules}, None


def get_commentary(tournament_id: str, matchup_id: str, custom_prompt: str = ""):
    matchup_res = supabase.table("tournament_matchups").select("*").eq("id", matchup_id).execute()
    if not matchup_res.data:
        return None, "Matchup not found"
    m = matchup_res.data[0]

    history_res = supabase.table("matchups").select("*").execute()
    history_summary = f"{len(history_res.data)} past league matchups on record"

    prompt = (
        f"You are the trash-talk AI for a fantasy sports tournament. "
        f"Write spicy, fun rivalry commentary for this bracket matchup. "
        f"Home team user: {m['home_user_id'][:8]}. Away team user: {m['away_user_id'][:8] if m['away_user_id'] else 'BYE'}. "
        f"League history context: {history_summary}. "
        f"{'Additionl context: ' + custom_prompt if custom_prompt else ''}"
        f"Keep it under 100 words. Be bold and funny."
    )
    text = _ai(prompt)
    supabase.table("tournament_matchups"). update({"commentary": text}).eq("id", matchup_id).execute()
    return {"commentary": text}, None


def predict_winner(tournament_id: str, matchup_id: str):
    matchup_res = supabase.table("tournament_matchups").select("*").eq("id", matchup_id).execute()
    if not matchup_res.data:
        return None, "Matchup not found"
    m = matchup_res.data[0]

    tourney_res = supabase.table("tournaments").select("scoring_rules").eq("id", tournament_id).execute()
    rules = tourney_res.data[0].get("scoring_rules") if tourney_res.data else {}

    prompt = (
        f"You are a fantasy sports analyst predicting a bracket matchup winner. "
        f"Home: {m['home_user_id'][:8]}, Away: {m['away_user_id'][:8] if m['away_user_id'] else 'BYE'}. "
        f"Current score: {m['home_points']} vs {m['away_points']}. "
        f"Tournament scoring rules: {json.dumps(rules)}. "
        f"Give a confident, fun 2-sentence prediction with a winner pick."
    )
    text = _ai(prompt)
    return {"prediction": text}, None

