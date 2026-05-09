import requests
from app.core.supabase import supabase

CURRENT_SEASON = 2024

def safe_int(val):
    try:
        return int(float(str(val).replace("--", "0").replace("/", "0")))
    except (ValueError, TypeError):
        return 0

def fetch_and_cache_stats(week: int) -> int:
    scoreboard = requests.get(
        "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
        params={"seasontype": 2, "week": week, "limit": 20},
        timeout=30
    ).json()

    game_ids = [e["id"] for e in scoreboard.get("events", [])]
    player_stats: dict = {}

    for game_id in game_ids:
        summary = requests.get(
            "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary",
            params={"event": game_id},
            timeout=30
        ).json()

        for team in summary.get("boxscore", {}).get("players", []):
            for group in team.get("statistics", []):
                name = group.get("name", "")
                keys = group.get("keys", [])

                for entry in group.get("athletes", []):
                    pid = entry.get("athlete", {}).get("id", "")
                    if not pid:
                        continue
                    if pid not in player_stats:
                        player_stats[pid] = {}

                    stat = dict(zip(keys, entry.get("stats", [])))

                    if name == "passing":
                        player_stats[pid]["passing_yards"] = safe_int(stat.get("passingYards"))
                        player_stats[pid]["passing_tds"] = safe_int(stat.get("passingTouchdowns"))
                        player_stats[pid]["interceptions"] = safe_int(stat.get("interceptions"))
                    elif name == "rushing":
                        player_stats[pid]["rushing_yards"] = safe_int(stat.get("rushingYards"))
                        player_stats[pid]["rushing_tds"] = safe_int(stat.get("rushingTouchdowns"))
                    elif name == "receiving":
                        player_stats[pid]["receiving_yards"] = safe_int(stat.get("receivingYards"))
                        player_stats[pid]["receiving_tds"] = safe_int(stat.get("receivingTouchdowns"))
                        player_stats[pid]["receptions"] = safe_int(stat.get("receptions"))
                    elif name == "fumbles":
                        player_stats[pid]["fumbles_lost"] = safe_int(stat.get("fumblesLost"))

    rows = [
        {"player_id": pid, "week": week, "season": CURRENT_SEASON, **stats}
        for pid, stats in player_stats.items()
        if stats
    ]

    if not rows:
        return 0

    known_ids = {
        p["id"] for p in
        supabase.table("players").select("id").execute().data
    }
    rows = [r for r in rows if r["player_id"] in known_ids]

    if rows:
        supabase.table("player_stats").upsert(
            rows, on_conflict="player_id,week,season"
        ).execute()

    return len(rows)


