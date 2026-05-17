import requests

ESPN_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def get_headlines():
    try:
        res = requests.get(
            "https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=12",
            headers=ESPN_HEADERS,
            timeout=8,
        )
        articles = res.json().get("articles", [])
        out = []
        for a in articles:
            link = a.get("links", {}).get("web", {}).get("href", "")
            desc = (a.get("description") or "")[:140]
            if a.get("headline") and link:
                out.append({"headline": a["headline"], "description": desc, "link": link})
        return out, None
    except Exception as e:
        return [], str(e)


def get_scoreboard():
    try:
        res = requests.get(
            "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
            headers=ESPN_HEADERS,
            timeout=8,
        )
        events = res.json().get("events", [])
        out = []
        for event in events:
            comp = event.get("competitions", [{}])[0]
            competitors = comp.get("competitors", [])
            if len(competitors) < 2:
                continue
            home = next((c for c in competitors if c.get("homeAway") == "home"), competitors[0])
            away = next((c for c in competitors if c.get("homeAway") == "away"), competitors[1])
            status = event.get("status", {})
            status_type = status.get("type", {})
            out.append({
                "home_team": home.get("team", {}).get("abbreviation", ""),
                "home_name": home.get("team", {}).get("displayName", ""),
                "home_score": home.get("score", "0"),
                "away_team": away.get("team", {}).get("abbreviation", ""),
                "away_name": away.get("team", {}).get("displayName", ""),
                "away_score": away.get("score", "0"),
                "status": status_type.get("description", ""),
                "completed": status_type.get("completed", False),
                "period": status.get("period", 0),
                "clock": status.get("displayClock", ""),
            })
        return out, None
    except Exception as e:
        return [], str(e)
