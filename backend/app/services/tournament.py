import anthropic
import json
import random
from app.core.supabase import supabase
from app.core.config import settings

_anthropic = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=120.0)


async def _ai(prompt: str, max_tokens: int = 1024) -> str:
    msg = await _anthropic.messages.create(
        model="claude-opus-4-7",
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text


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


async def _generate_draft_name() -> str:
    try:
        msg = await _anthropic.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=16,
            messages=[{"role": "user", "content": "Generate one creative fantasy sports team name. Return ONLY the name, nothing else. Be varied and inventive."}],
        )
        return msg.content[0].text.strip().strip('"').strip("'")
    except Exception:
        return "Mystery Squad"


def _parse_json(raw: str):
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())


async def create_tournament(league_id: str, user_id: str, data):
    active_res = supabase.table("tournaments").select("id").eq("league_id", league_id).neq("status", "completed").execute()
    if len(active_res.data) >= 3:
        return None, "Maximum 3 active tournaments allowed. Wait for one to complete first."

    res = supabase.table("tournaments").insert({
        "league_id": league_id,
        "name": data.name,
        "theme": data.theme,
        "entry_fee": data.entry_fee,
        "entity_type": data.entity_type,
        "format": data.format,
        "score_mode": data.score_mode,
    }).execute()
    tourney = res.data[0]

    theme = data.theme or data.name
    entity_type = data.entity_type or "auto-detect"
    fmt = data.format or "points_race"
    format_desc = (
        "Head-to-head bracket — each round of the real event maps to a fantasy bracket round."
        if fmt == "bracket"
        else "Points race — the user with the most total points across the whole event wins."
    )

    scoring_prompt = f"""You are designing scoring rules for a fantasy tournament. Search the web for current information about this event.

Event: "{theme}"
Entity type being drafted: {entity_type}
Tournament format: {format_desc}

Search for what this event actually measures (medals, goals, wins, placements, times, etc.) and the competitive structure.
Create specific, measurable scoring rules tied to real observable outcomes. Include 6-12 bonus types.

Return ONLY valid JSON (no markdown):
{{"description": "one sentence describing the scoring system", "bonuses": [{{"name": "outcome name", "points": 3}}]}}"""

    raw = await _ai_with_search(scoring_prompt, max_tokens=2048)
    try:
        scoring_rules = _parse_json(raw)
    except Exception:
        scoring_rules = {"description": f"Custom scoring for {theme}", "bonuses": []}

    supabase.table("tournaments").update({"scoring_rules": scoring_rules}).eq("id", tourney["id"]).execute()
    tourney["scoring_rules"] = scoring_rules
    return tourney, None


def list_tournaments(league_id: str, user_id: str = ""):
    res = supabase.table("tournaments").select("*").eq("league_id", league_id).order("created_at", desc=True).execute()
    if not res.data:
        return []
    tournament_ids = [t["id"] for t in res.data]
    members_res = supabase.table("tournament_members").select("tournament_id, user_id").in_("tournament_id", tournament_ids).execute()
    counts: dict[str, int] = {}
    user_memberships: set[str] = set()
    for m in members_res.data:
        counts[m["tournament_id"]] = counts.get(m["tournament_id"], 0) + 1
        if m["user_id"] == user_id:
            user_memberships.add(m["tournament_id"])
    for t in res.data:
        t["member_count"] = counts.get(t["id"], 0)
        t["is_member"] = t["id"] in user_memberships
    return res.data


async def join_tournament(tournament_id: str, user_id: str):
    existing = supabase.table("tournament_members").select("id").eq("tournament_id", tournament_id).eq("user_id", user_id).execute()
    if existing.data:
        return None, "Already joined"
    draft_team_name = await _generate_draft_name()
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
    winner = max(set(votes), key=votes.count) if votes else "claude"
    supabase.table("tournaments").update({"ai_brain": winner}).eq("id", tournament_id).execute()
    return {"ai_brain": winner}


async def generate_bracket(tournament_id: str):
    tourney_res = supabase.table("tournaments").select("*").eq("id", tournament_id).execute()
    if not tourney_res.data:
        return None, "Tournament not found"
    tourney = tourney_res.data[0]

    members_res = supabase.table("tournament_members").select("user_id").eq("tournament_id", tournament_id).execute()
    user_ids = [r["user_id"] for r in members_res.data]
    if len(user_ids) < 2:
        return None, "Need at least 2 members"

    random.shuffle(user_ids)
    if len(user_ids) % 2 != 0:
        user_ids.append(user_ids[0])

    matchups = []
    for i in range(0, len(user_ids), 2):
        matchups.append({
            "tournament_id": tournament_id,
            "round": 1,
            "home_user_id": user_ids[i],
            "away_user_id": user_ids[i + 1]
        })
    supabase.table("tournament_matchups").insert(matchups).execute()

    theme = tourney.get("theme") or tourney.get("name") or "fantasy sports tournament"
    entity_type = tourney.get("entity_type") or "auto-detect"
    fmt = tourney.get("format") or "points_race"
    score_mode = tourney.get("score_mode") or "manual"

    format_desc = (
        "Head-to-head bracket — each round of the real event maps to a fantasy bracket round. "
        "Users advance by outscoring their opponent in that round."
        if fmt == "bracket"
        else "Points race — the user with the most total points across the whole event wins."
    )
    score_desc = (
        "Scores will be updated automatically using real-time sports data feeds."
        if score_mode == "auto"
        else "Scores will be entered manually by the commissioner after each round/event."
    )

    scoring_prompt = f"""You are designing scoring rules for a fantasy tournament. Search the web for current information about this event.

Event: "{theme}"
Entity type being drafted: {entity_type}
Tournament format: {format_desc}
Score tracking: {score_desc}

Search for:
1. What this event actually measures (medals, goals, wins, placements, times, etc.)
2. The competitive structure (rounds, heats, group stages, etc.)
3. Current or recent participants/standings to understand scale

Then create specific, measurable scoring rules that reflect how this event actually works. Rules should be:
- Tied to real, observable outcomes (not vague)
- Calibrated so scores are meaningful (not all zero or all huge)
- Fun and event-appropriate

Return ONLY valid JSON (no markdown):
{{"description": "one sentence describing the scoring system", "bonuses": [{{"name": "outcome name", "points": 3}}]}}"""

    raw = await _ai_with_search(scoring_prompt, max_tokens=2048)

    try:
        scoring_rules = _parse_json(raw)
    except Exception:
        scoring_rules = {"description": raw[:200], "bonuses": []}

    supabase.table("tournaments").update({
        "scoring_rules": scoring_rules,
        "status": "active",
    }).eq("id", tournament_id).execute()

    return {"matchups": matchups, "scoring_rules": scoring_rules}, None


async def close_draft_and_generate_bracket(tournament_id: str):
    supabase.table("tournaments").update({"status": "active"}).eq("id", tournament_id).execute()
    return await generate_bracket(tournament_id)


async def get_commentary(tournament_id: str, matchup_id: str, custom_prompt: str = ""):
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
        f"{'Additional context: ' + custom_prompt if custom_prompt else ''}"
        f"Keep it under 100 words. Be bold and funny."
    )
    text = await _ai(prompt)
    supabase.table("tournament_matchups").update({"commentary": text}).eq("id", matchup_id).execute()
    return {"commentary": text}, None


async def predict_winner(tournament_id: str, matchup_id: str):
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
    text = await _ai(prompt)
    return {"prediction": text}, None
