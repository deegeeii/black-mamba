import random
from app.core.supabase import supabase

CURRENT_SEASON = 2024

def generate_matchups(league_id: str, week: int):
    existing = (
        supabase.table("matchups")
        .select("id")
        .eq("league_id", league_id)
        .eq("week", week)
        .eq("season", CURRENT_SEASON)
        .execute()
    )
    if existing.data:
        return existing.data, None
    
    members = supabase.table("league_members").select("user_id").eq("league_id", league_id).execute()
    user_ids = [m["user_id"] for m in members.data]

    if len(user_ids) < 2:
        return None, "Not enough teams to generate matchups"
    
    random.shuffle(user_ids)
    if len(user_ids) % 2 != 0:
        user_ids.append(user_ids[0]) # bye week: pair firtst team twice

    pairs = [(user_ids[i], user_ids[i + 1]) for i in range(0, len(user_ids), 2)]
    rows = [
        {
            "league_id": league_id,
            "week": week,
            "season": CURRENT_SEASON,
            "home_user_id": home,
            "away_user_id": away,
        }
        for home, away in pairs
    ]

    res = supabase.table("matchups").insert(rows).execute()
    return res.data, None


def get_matchups(league_id: str, week: int):
    res = (
        supabase.table("matchups")
        .select("*")
        .eq("league_id", league_id)
        .eq("week", week)
        .eq("season", CURRENT_SEASON)
        .execute()
    )
    return res.data


def score_matchups(league_id: str, week: int):
    matchups = get_matchups(league_id, week)
    if not matchups:
        return None, "No matchups found for this week"
    
    scores_res = (
        supabase.table("weekly_scores")
        .select("user_id, total_points")
        .eq("league_id", league_id)
        .eq("week", week)
        .eq("season", CURRENT_SEASON)
        .execute()
    )
    score_map = {s["user_id"]: s["total_points"] for s in scores_res.data}

    updates = []
    for m in matchups:
        home_pts = score_map.get(m["home_user_id"], 0)
        away_pts = score_map.get(m["away_user_id"], 0)
        winner = m["home_user_id"] if home_pts >= away_pts else m["away_user_id"]
        updates.append({
            "id": m["id"],
            "league_id": m["league_id"],
            "week": m["week"],
            "season": m["season"],
            "home_user_id": m["home_user_id"],
            "away_user_id": m["away_user_id"],
            "home_points": home_pts,
            "away_points": away_pts,
            "winner_user_id": winner,
        })


    res = supabase.table("matchups").upsert(updates).execute()
    return res.data, None


def get_standings(league_id: str):
    matchups = (
        supabase.table("matchups")
        .select("home_user_id, away_user_id, home_points, away_points, winner_user_id")
        .eq("league_id", league_id)
        .eq("season", CURRENT_SEASON)
        .not_.is_("winner_user_id", "null")
        .execute()
    )

    standings: dict = {}
    for m in matchups.data:
        for uid in [m["home_user_id"], m["away_user_id"]]:
            if uid not in standings:
                standings[uid] = {"user_id": uid, "wins": 0, "losses": 0, "points_for": 0}

        if m["home_user_id"] == m["winner_user_id"]:
            standings[m["home_user_id"]]["wins"] += 1
            standings[m["away_user_id"]]["losses"] += 1
        else:
            standings[m["away_user_id"]]["wins"] += 1
            standings[m["home_user_id"]]["losses"] += 1

        standings[m["home_user_id"]]["points_for"] += float(m["home_points"])
        standings[m["away_user_id"]]["points_for"] += float(m["away_points"])

    return sorted(standings.values(), key=lambda x: (-x["wins"], -x["points_for"]))

