# backend/app/services/waiver.py

from typing import Optional
from app.core.supabase import supabase

MAX_ROSTER_SIZE = 15


def _rostered_player_ids(league_id: str):
    """Returns {user_id: set(player_ids)} for all teams in the league."""
    picks = (
        supabase.table("draft_picks")
        .select("user_id, player_id")
        .eq("league_id", league_id)
        .execute()
    )
    moves = (
        supabase.table("roster_moves")
        .select("user_id, player_id, move_type")
        .eq("league_id", league_id)
        .execute()
    )

    roster = {}  # type: dict
    for p in (picks.data or []):
        roster.setdefault(p["user_id"], set()).add(p["player_id"])

    for m in (moves.data or []):
        uid = m["user_id"]
        roster.setdefault(uid, set())
        if m["move_type"] == "add":
            roster[uid].add(m["player_id"])
        elif m["move_type"] == "drop":
            roster[uid].discard(m["player_id"])

    return roster


def get_free_agents(league_id: str, position: Optional[str] = None, search: Optional[str] = None):
    roster_map = _rostered_player_ids(league_id)
    all_rostered = set().union(*roster_map.values()) if roster_map else set()

    query = supabase.table("players").select("id, name, position, nfl_team")
    if position:
        query = query.eq("position", position)
    if search:
        query = query.ilike("name", f"%{search}%")

    res = query.order("name").execute()
    return [p for p in (res.data or []) if p["id"] not in all_rostered]


def get_my_roster(league_id: str, user_id: str):
    roster_map = _rostered_player_ids(league_id)
    my_ids = roster_map.get(user_id, set())
    if not my_ids:
        return []

    res = (
        supabase.table("players")
        .select("id, name, position, nfl_team")
        .in_("id", list(my_ids))
        .execute()
    )
    return res.data or []


def add_player(league_id: str, user_id: str, player_id: str, drop_player_id: Optional[str], week: int):
    roster_map = _rostered_player_ids(league_id)
    my_ids = roster_map.get(user_id, set())
    all_rostered = set().union(*roster_map.values()) if roster_map else set()

    if player_id in all_rostered:
        return None, "Player is already on a roster"

    will_have = len(my_ids) + 1 - (1 if drop_player_id else 0)
    if will_have > MAX_ROSTER_SIZE:
        return None, f"Roster full ({MAX_ROSTER_SIZE} max). Must drop a player."

    if drop_player_id and drop_player_id not in my_ids:
        return None, "Drop player not on your roster"

    rows = [{"league_id": league_id, "user_id": user_id, "player_id": player_id, "move_type": "add", "week": week}]
    if drop_player_id:
        rows.append({"league_id": league_id, "user_id": user_id, "player_id": drop_player_id, "move_type": "drop", "week": week})

    res = supabase.table("roster_moves").insert(rows).execute()
    return res.data, None


def drop_player(league_id: str, user_id: str, player_id: str, week: int):
    roster_map = _rostered_player_ids(league_id)
    my_ids = roster_map.get(user_id, set())

    if player_id not in my_ids:
        return None, "Player not on your roster"

    res = (
        supabase.table("roster_moves")
        .insert({"league_id": league_id, "user_id": user_id, "player_id": player_id, "move_type": "drop", "week": week})
        .execute()
    )
    return res.data, None
