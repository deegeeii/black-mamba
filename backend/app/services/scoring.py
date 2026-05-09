from app.core.supabase import supabase

CURRENT_SEASON = 2024

def calculate_points(stats: dict, scoring_type: str) -> float:
    ppr = {"standard": 0, "standard_plus": 0.5, "dynasty": 1}.get(scoring_type, 0)
    return round(
        (stats.get("passing_yards") or 0) * 0.04
        + (stats.get("passing_tds") or 0) * 4
        + (stats.get("interceptions") or 0) * -2
        + (stats.get("rushing_yards") or 0) * 0.1
        + (stats.get("rushing_tds") or 0) * 6
        + (stats.get("receiving_yards") or 0) * 0.1
        + (stats.get("receiving_tds") or 0) * 6
        + (stats.get("receptions") or 0) * ppr
        + (stats.get("return_tds") or 0) * 6
        + (stats.get("two_point_conversions") or 0) * 2
        + (stats.get("fumbles_lost") or 0) * -2,
        2
    )


def get_weekly_scores(league_id: str, week: int):
    res = (
        supabase.table("weekly_scores")
        .select("user_id, total_points")
        .eq("league_id", league_id)
        .eq("week", week)
        .eq("season", CURRENT_SEASON)
        .execute()
    )
    return res.data


def get_my_score(league_id: str, user_id: str, week: int):
    res = (
        supabase.table("weekly_scores")
        .select("*")
        .eq("league_id", league_id)
        .eq("user_id", user_id)
        .eq("week", week)
        .eq("season", CURRENT_SEASON)
        .execute()
    )
    return res.data[0] if res.data else None


def sync_scores(league_id: str, week: int):
    league = supabase.table("leagues").select("scoring_type").eq("id", league_id).execute()
    if not league.data:
        return None, "League not found"
    scoring_type = league.data[0]["scoring_type"]

    members = supabase.table("league_members").select("user_id").eq("league_id", league_id).execute()

    rows = []
    for member in members.data:
        user_id = member["user_id"]

        lineup = (
            supabase.table("lineups")
            .select("player_id")
            .eq("league_id", league_id)
            .eq("user_id", user_id)
            .eq("week", week)
            .neq("slot", "BN")
            .execute()
        )
        player_ids = [s["player_id"] for s in lineup.data]
        if not player_ids:
            continue

        stats = (
            supabase.table("player_stats")
            .select("*")
            .eq("week", week)
            .eq("season", CURRENT_SEASON)
            .in_("player_id", player_ids)
            .execute()
        )

        total = sum(calculate_points(s, scoring_type) for s in stats.data)
        rows.append({
            "league_id": league_id,
            "user_id": user_id,
            "week": week,
            "season": CURRENT_SEASON,
            "total_points": total,
        })

    if not rows:
        return [], None

    res = (
        supabase.table("weekly_scores")
        .upsert(rows, on_conflict="league_id,user_id,week,season")
        .execute()
    )
    return res.data, None
