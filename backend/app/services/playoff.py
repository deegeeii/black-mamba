# backend/app/services/playoff.py

from typing import Optional
from app.core.supabase import supabase

CURRENT_SEASON = 2024
WILDCARD_WEEK = 15
SEMIFINAL_WEEK = 16
CHAMPIONSHIP_WEEK = 17


def _get_league(league_id: str):
    res = supabase.table("leagues").select("*").eq("id", league_id).execute()
    return res.data[0] if res.data else None


def _get_standings(league_id: str):
    from app.services.matchup import get_standings
    return get_standings(league_id)


def _get_money_won(league_id: str):
    res = (
        supabase.table("bets")
        .select("winner_id")
        .eq("league_id", league_id)
        .eq("status", "settled")
        .execute()
    )
    totals = {}
    for b in (res.data or []):
        uid = b["winner_id"]
        if uid:
            totals[uid] = totals.get(uid, 0) + 1
    return totals


def _get_h2h(league_id: str, user_a: str, user_b: str):
    res = (
        supabase.table("matchups")
        .select("home_user_id, away_user_id, winner_user_id")
        .eq("league_id", league_id)
        .eq("season", CURRENT_SEASON)
        .execute()
    )
    a_wins = b_wins = 0
    for m in (res.data or []):
        participants = {m["home_user_id"], m["away_user_id"]}
        if {user_a, user_b} == participants:
            if m["winner_user_id"] == user_a:
                a_wins += 1
            elif m["winner_user_id"] == user_b:
                b_wins += 1
    return a_wins, b_wins


def _seed_teams(league_id: str, playoff_teams: int, tiebreaker: str):
    standings = _get_standings(league_id)
    money_map = _get_money_won(league_id) if tiebreaker == "money_won" else {}

    def sort_key(s):
        if tiebreaker == "money_won":
            return (-s["wins"], -money_map.get(s["user_id"], 0), -s["points_for"])
        return (-s["wins"], -s["points_for"])

    sorted_teams = sorted(standings, key=sort_key)

    if tiebreaker == "head_to_head" and len(sorted_teams) >= 2:
        for i in range(len(sorted_teams) - 1):
            a = sorted_teams[i]
            b = sorted_teams[i + 1]
            if a["wins"] == b["wins"] and a["points_for"] == b["points_for"]:
                a_wins, b_wins = _get_h2h(league_id, a["user_id"], b["user_id"])
                if b_wins > a_wins:
                    sorted_teams[i], sorted_teams[i + 1] = b, a

    return [t["user_id"] for t in sorted_teams[:playoff_teams]]


def generate_bracket(league_id: str):
    league = _get_league(league_id)
    if not league:
        return None, "League not found"

    existing = (
        supabase.table("playoff_matchups")
        .select("id")
        .eq("league_id", league_id)
        .execute()
    )
    if existing.data:
        return None, "Bracket already generated"

    playoff_teams = league.get("playoff_teams", 6)
    tiebreaker = league.get("tiebreaker", "points")
    seeds = _seed_teams(league_id, playoff_teams, tiebreaker)

    if len(seeds) < playoff_teams:
        return None, "Not enough teams in standings"

    # 6-team: seeds[0] and seeds[1] get bye, wildcard: seeds[2]v seeds[5], seeds[3]v seeds[4]
    # 4-team: no wildcard, go straight to semis
    # 8-team: seeds[0]-seeds[1] bye, wildcard: seeds[2]v seeds[7], [3]v[6], [4]v[5]
    rows = []
    if playoff_teams == 6:
        rows = [
            {"league_id": league_id, "home_user_id": seeds[2], "away_user_id": seeds[5], "round": "wildcard", "week": WILDCARD_WEEK},
            {"league_id": league_id, "home_user_id": seeds[3], "away_user_id": seeds[4], "round": "wildcard", "week": WILDCARD_WEEK},
        ]
    elif playoff_teams == 4:
        rows = [
            {"league_id": league_id, "home_user_id": seeds[0], "away_user_id": seeds[3], "round": "semifinal", "week": SEMIFINAL_WEEK},
            {"league_id": league_id, "home_user_id": seeds[1], "away_user_id": seeds[2], "round": "semifinal", "week": SEMIFINAL_WEEK},
        ]
    elif playoff_teams == 8:
        rows = [
            {"league_id": league_id, "home_user_id": seeds[2], "away_user_id": seeds[7], "round": "wildcard", "week": WILDCARD_WEEK},
            {"league_id": league_id, "home_user_id": seeds[3], "away_user_id": seeds[6], "round": "wildcard", "week": WILDCARD_WEEK},
            {"league_id": league_id, "home_user_id": seeds[4], "away_user_id": seeds[5], "round": "wildcard", "week": WILDCARD_WEEK},
        ]

    res = supabase.table("playoff_matchups").insert(rows).execute()
    return {"seeds": seeds, "matchups": res.data}, None


def advance_round(league_id: str, completed_week: int):
    matchups = (
        supabase.table("playoff_matchups")
        .select("*")
        .eq("league_id", league_id)
        .eq("week", completed_week)
        .execute()
    ).data or []

    if not matchups:
        return None, "No matchups found for that week"
    if any(not m.get("winner_user_id") for m in matchups):
        return None, "Not all matchups have been scored yet"

    league = _get_league(league_id)
    playoff_teams = league.get("playoff_teams", 6)
    seeds = _seed_teams(league_id, playoff_teams, league.get("tiebreaker", "points"))

    winners = [m["winner_user_id"] for m in matchups]
    losers = [m["home_user_id"] if m["winner_user_id"] == m["away_user_id"] else m["away_user_id"] for m in matchups]
    current_round = matchups[0]["round"]

    rows = []
    if current_round == "wildcard":
        # seeds 0 and 1 get byes, match against wildcard winners by seed order
        bye_teams = [seeds[0], seeds[1]]
        sorted_winners = sorted(winners, key=lambda uid: seeds.index(uid))
        rows = [
            {"league_id": league_id, "home_user_id": bye_teams[0], "away_user_id": sorted_winners[-1], "round": "semifinal", "week": SEMIFINAL_WEEK},
            {"league_id": league_id, "home_user_id": bye_teams[1], "away_user_id": sorted_winners[0], "round": "semifinal", "week": SEMIFINAL_WEEK},
        ]
    elif current_round == "semifinal":
        rows = [
            {"league_id": league_id, "home_user_id": winners[0], "away_user_id": winners[1], "round": "championship", "week": CHAMPIONSHIP_WEEK},
            {"league_id": league_id, "home_user_id": losers[0], "away_user_id": losers[1], "round": "third_place", "week": CHAMPIONSHIP_WEEK},
        ]

    res = supabase.table("playoff_matchups").insert(rows).execute()
    return res.data, None


def score_playoff_week(league_id: str, week: int):
    matchups = (
        supabase.table("playoff_matchups")
        .select("*")
        .eq("league_id", league_id)
        .eq("week", week)
        .execute()
    ).data or []

    if not matchups:
        return None, "No playoff matchups for this week"

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
        updates.append({**m, "home_points": home_pts, "away_points": away_pts, "winner_user_id": winner})

    res = supabase.table("playoff_matchups").upsert(updates).execute()
    return res.data, None


def get_playoff_matchups(league_id: str):
    res = (
        supabase.table("playoff_matchups")
        .select("*")
        .eq("league_id", league_id)
        .order("week")
        .execute()
    )
    return res.data or []


def update_league_settings(league_id: str, user_id: str, playoff_teams: Optional[int], tiebreaker: Optional[str]):
    member = (
        supabase.table("league_members")
        .select("role")
        .eq("league_id", league_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not member.data or member.data[0].get("role") != "commissioner":
        return None, "Only the commissioner can change league settings"

    updates = {}
    if playoff_teams is not None:
        if playoff_teams not in [4, 6, 8]:
            return None, "playoff_teams must be 4, 6, or 8"
        updates["playoff_teams"] = playoff_teams
    if tiebreaker is not None:
        if tiebreaker not in ["points", "money_won", "head_to_head"]:
            return None, "Invalid tiebreaker"
        updates["tiebreaker"] = tiebreaker

    res = supabase.table("leagues").update(updates).eq("id", league_id).execute()
    return res.data, None
