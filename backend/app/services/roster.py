
from app.core.supabase import supabase

def get_my_roster(league_id: str, user_id: str):
    from app.services.waiver import _rostered_player_ids
    roster_map = _rostered_player_ids(league_id)
    my_ids = roster_map.get(user_id, set())
    if not my_ids:
        return []

    picks = (
        supabase.table("draft_picks")
        .select("player_id, round, pick_number")
        .eq("league_id", league_id)
        .eq("user_id", user_id)
        .execute()
    )
    pick_meta = {p["player_id"]: p for p in (picks.data or [])}

    players = (
        supabase.table("players")
        .select("id, name, position, nfl_team")
        .in_("id", list(my_ids))
        .execute()
    )

    result = []
    for p in (players.data or []):
        meta = pick_meta.get(p["id"], {})
        result.append({
            "player_id": p["id"],
            "name": p["name"],
            "position": p["position"],
            "nfl_team": p.get("nfl_team"),
            "round": meta.get("round", 0),
            "pick_number": meta.get("pick_number", 0),
        })
    return result



def get_lineup(league_id: str, user_id: str, week: int):
    res = (
        supabase.table("lineups")
        .select("*")
        .eq("league_id", league_id)
        .eq("user_id", user_id)
        .eq("week", week)
        .execute()
    )

    return res.data

def set_lineup(league_id: str, user_id: str, week: int, slots: dict):
    rows = [
        {
            "league_id": league_id,
            "user_id": user_id,
            "week": week,
            "player_id": player_id,
            "slot": slot, 
        }
        for slot, player_id in slots.items()
    ]
    res = (
        supabase.table("lineups")
        .upsert(rows, on_conflict="league_id,user_id,week,slot")
        .execute()
    )
    
    return res.data

