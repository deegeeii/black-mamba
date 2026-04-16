import httpx
from app.core.supabase import supabase

ESPN_TEAMS_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams"
ESPN_ROSTER_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{team_id}/roster"

FANTASY_POSITIONS = {"QB", "RB", "WR", "TE", "K"}

def fetch_and_cache_players():
    with httpx.Client(timeout=30) as client:
        teams_res = client.get(ESPN_TEAMS_URL)
        teams = teams_res.json()["sports"][0]["leagues"][0]["teams"]

        players = []

        for team_entry in teams:
            team = team_entry["team"]
            team_id = team["id"]
            team_abbr = team.get("abbreviation", "")

            try:
                roster_res = client.get(ESPN_ROSTER_URL.format(team_id=team_id))
                roster_data = roster_res.json()
            except Exception:
                continue

            for group in roster_data.get("athletes", []):
                for athlete in group.get("items", []):
                    position = athlete.get("position", {}).get("abbreviation", "")
                    if position not in FANTASY_POSITIONS:
                        continue

                    players.append({
                        "id": str(athlete["id"]),
                        "name": athlete["fullName"],
                        "position": position,
                        "nfl_team": team_abbr,
                        "headshot_url": athlete.get("headshot", {}).get("href"),
                    })

        if players:
            supabase.table("players").upsert(players).execute()

        return players

def get_cached_players(position: str = None):
    query = supabase.table("players").select("*")
    if position:
        query = query.eq("position", position)
    return query.order("name").execute().data
