from app.core.supabase import supabase

CURRENT_SEASON = 2024


def get_league_keepers(league_id: str):
    res = (
        supabase.table("keeper_selections")
        .select("*, players(id, name, position, nfl_team)")
        .eq("league_id", league_id)
        .eq("season", CURRENT_SEASON)
        .execute()
    )
    return res.data or []


def declare_keeper(league_id: str, user_id: str, player_id: str):
    # Check league is dynasty
    league = (
        supabase.table("leagues")
        .select("scoring_type, max_keepers")
        .eq("id", league_id)
        .execute()
    )
    if not league.data:
        return None, "League not found"
    if league.data[0]["scoring_type"] != "dynasty":
        return None, "Keepers are only available in Dynasty leagues"

    max_keepers = league.data[0].get("max_keepers") or 2

    # Check keeper limit
    existing = (
        supabase.table("keeper_selections")
        .select("id")
        .eq("league_id", league_id)
        .eq("user_id", user_id)
        .eq("season", CURRENT_SEASON)
        .execute()
    )
    if len(existing.data or []) >= max_keepers:
        return None, f"You have already declared the maximum of {max_keepers} keepers"

    # Get cost round from draft history (round they were originally drafted)
    pick = (
        supabase.table("draft_picks")
        .select("round")
        .eq("league_id", league_id)
        .eq("player_id", player_id)
        .execute()
    )
    cost_round = pick.data[0]["round"] if pick.data else 1

    res = (
        supabase.table("keeper_selections")
        .insert({
            "league_id": league_id,
            "user_id": user_id,
            "player_id": player_id,
            "cost_round": cost_round,
            "season": CURRENT_SEASON,
        })
        .execute()
    )
    return res.data[0] if res.data else None, None


def remove_keeper(league_id: str, user_id: str, player_id: str):
    res = (
        supabase.table("keeper_selections")
        .delete()
        .eq("league_id", league_id)
        .eq("user_id", user_id)
        .eq("player_id", player_id)
        .eq("season", CURRENT_SEASON)
        .execute()
    )
    return res.data
