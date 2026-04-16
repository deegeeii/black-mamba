
from app.core.supabase import supabase

def get_my_roster(league_id: str, user_id: str):
    picks = (
        supabase.table("draft_picks")
        .select("player_id, round, pick_number")
        .eq("league_id", league_id)
        .eq("user_id", user_id)
        .order("pick_number")
        .execute()
    )
    if not picks.data:
        return []

    player_ids = [p["player_id"] for p in picks.data]
    players = (
        supabase.table("players")
        .select("id, name, position, nfl_team")
        .in_("id", player_ids)
        .execute()
    )
    player_map = {p["id"]: p for p in players.data}

    result = []
    for pick in picks.data:
        player = player_map.get(pick["player_id"], {})
        result.append({
            "player_id": pick["player_id"],
            "name": player.get("name", ""),
            "position": player.get("position", ""),
            "nfl_team": player.get("nfl_team"),
            "round": pick["round"],
            "pick_number": pick["pick_number"],
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

