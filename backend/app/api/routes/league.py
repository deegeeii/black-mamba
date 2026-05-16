
from fastapi import APIRouter, Depends, HTTPException
from app.models.league import LeagueCreate, LeagueResponse, JoinLeague
from app.services.league import create_league, get_user_leagues, join_league
from app.core.security import get_current_user_id
from app.core.supabase import supabase
from pydantic import BaseModel
from typing import List, Optional
import requests

router = APIRouter(prefix="/leagues", tags=["leagues"])


class TeamSettingsUpdate(BaseModel):
    team_name: Optional[str] = None
    avatar_url: Optional[str] = None


class AwardCreate(BaseModel):
    season: int
    award_name: str
    user_id: str

class ESPNImport(BaseModel):
    espn_league_id: str
    season: int
    espn_s2: Optional[str] = None
    swid: Optional[str] = None



@router.post("/", response_model=LeagueResponse)
def create_new_league(data: LeagueCreate, user_id: str = Depends(get_current_user_id)):
    return create_league(user_id, data)

@router.get("/", response_model=List[LeagueResponse])
def fetch_user_leagues(user_id: str = Depends(get_current_user_id)):
    return get_user_leagues(user_id)

@router.get("", response_model=List[LeagueResponse])
def fetch_user_leagues_no_slash(user_id: str = Depends(get_current_user_id)):
    return get_user_leagues(user_id)

@router.post("/join", response_model=LeagueResponse)
def join_existing_league(data: JoinLeague, user_id: str = Depends(get_current_user_id)):
    league = join_league(user_id, data)
    if not league:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    return league


@router.get("/{league_id}/members")
def fetch_members(league_id: str, user_id: str = Depends(get_current_user_id)):
    members_res = supabase.table("league_members").select("user_id, team_name").eq("league_id", league_id).execute()
    user_ids = [m["user_id"] for m in (members_res.data or [])]
    if not user_ids:
        return []
    league_team_map = {m["user_id"]: m.get("team_name") for m in (members_res.data or [])}
    profiles_res = supabase.table("profiles").select("id, username, team_name, avatar_url").in_("id", user_ids).execute()
    profiles_map = {p["id"]: p for p in (profiles_res.data or [])}
    result = []
    for uid in user_ids:
        p = profiles_map.get(uid, {})
        result.append({
            "user_id": uid,
            "team_name": league_team_map.get(uid) or p.get("team_name") or p.get("username") or "Unknown Team",
            "avatar_url": p.get("avatar_url"),
        })
    return result


@router.patch("/{league_id}/my-team")
def update_my_team(league_id: str, data: TeamSettingsUpdate, user_id: str = Depends(get_current_user_id)):
    if data.team_name is not None:
        supabase.table("league_members").update({"team_name": data.team_name}).eq("league_id", league_id).eq("user_id", user_id).execute()
    if data.avatar_url is not None:
        supabase.table("profiles").update({"avatar_url": data.avatar_url}).eq("id", user_id).execute()
    return {"ok": True}


@router.get("/{league_id}/rosters")
def fetch_all_rosters(league_id: str, user_id: str = Depends(get_current_user_id)):
    from app.services.roster import get_my_roster
    members_res = supabase.table("league_members").select("user_id, team_name").eq("league_id", league_id).execute()
    user_ids = [m["user_id"] for m in (members_res.data or [])]
    league_team_map = {m["user_id"]: m.get("team_name") for m in (members_res.data or [])}
    profiles_res = supabase.table("profiles").select("id, username, team_name, avatar_url").in_("id", user_ids).execute()
    profiles_map = {p["id"]: p for p in (profiles_res.data or [])}
    result = []
    for uid in user_ids:
        p = profiles_map.get(uid, {})
        team_name = league_team_map.get(uid) or p.get("team_name") or p.get("username") or "Unknown Team"
        result.append({
            "user_id": uid,
            "team_name": team_name,
            "avatar_url": p.get("avatar_url"),
            "roster": get_my_roster(league_id, uid),
        })
    return result


@router.get("/{league_id}/history")
def fetch_history(league_id: str, user_id: str = Depends(get_current_user_id)):
    champ_res = supabase.table("playoff_matchups").select("season, winner_user_id").eq("league_id", league_id).eq("round", "championship").not_.is_("winner_user_id", "null").execute()
    scores_res = supabase.table("weekly_scores").select("season, user_id, total_points").eq("league_id", league_id).execute()
    awards_res = supabase.table("league_awards").select("*").eq("league_id", league_id).order("season", desc=True).execute()

    all_user_ids = list(set(
        [c["winner_user_id"] for c in (champ_res.data or [])] +
        [s["user_id"] for s in (scores_res.data or [])] +
        [a["user_id"] for a in (awards_res.data or []) if a.get("user_id")]
    ))

    profiles_map = {}
    league_team_map = {}
    if all_user_ids:
        profiles_res = supabase.table("profiles").select("id, username, team_name").in_("id", all_user_ids).execute()
        profiles_map = {p["id"]: p for p in (profiles_res.data or [])}
        members_res = supabase.table("league_members").select("user_id, team_name").eq("league_id", league_id).execute()
        league_team_map = {m["user_id"]: m.get("team_name") for m in (members_res.data or [])}

    def get_name(uid):
        if not uid: return "Unknown"
        p = profiles_map.get(uid, {})
        return league_team_map.get(uid) or p.get("team_name") or p.get("username") or "Unknown"

    season_high: dict = {}
    for s in (scores_res.data or []):
        season = s["season"]
        if season not in season_high or s["total_points"] > season_high[season]["points"]:
            season_high[season] = {"user_id": s["user_id"], "points": s["total_points"]}

    champ_map = {c["season"]: c["winner_user_id"] for c in (champ_res.data or [])}
    awards_by_season: dict = {}
    for a in (awards_res.data or []):
        awards_by_season.setdefault(a["season"], []).append({
            "id": a["id"],
            "award_name": a["award_name"],
            "user_id": a["user_id"],
            "team_name": get_name(a["user_id"]),
        })

    all_seasons = set(list(champ_map.keys()) + list(season_high.keys()))
    result = []
    for season in sorted(all_seasons, reverse=True):
        champion_uid = champ_map.get(season)
        high = season_high.get(season)
        result.append({
            "season": season,
            "champion": {"user_id": champion_uid, "team_name": get_name(champion_uid)} if champion_uid else None,
            "high_scorer": {"user_id": high["user_id"], "team_name": get_name(high["user_id"]), "points": high["points"]} if high else None,
            "awards": awards_by_season.get(season, []),
        })

        hist_res = (
        supabase.table("league_historical_seasons")
        .select("*")
        .eq("league_id", league_id)
        .order("season", desc=True)
        .execute()
    )
    existing_seasons = {r["season"] for r in result}
    for h in (hist_res.data or []):
        if h["season"] not in existing_seasons:
            result.append({
                "season": h["season"],
                "champion": {"user_id": None, "team_name": h["champion_name"]} if h["champion_name"] else None,
                "high_scorer": {
                    "user_id": None,
                    "team_name": h["high_scorer_name"],
                    "points": h["high_scorer_points"],
                } if h["high_scorer_name"] else None,
                "awards": [],
            })
    result.sort(key=lambda r: r["season"], reverse=True)

    return result


@router.post("/{league_id}/history/awards")
def add_award(league_id: str, data: AwardCreate, user_id: str = Depends(get_current_user_id)):
    league_res = supabase.table("leagues").select("commissioner_id").eq("id", league_id).execute()
    if not league_res.data or league_res.data[0]["commissioner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the commissioner can add awards")
    res = supabase.table("league_awards").insert({
        "league_id": league_id,
        "season": data.season,
        "award_name": data.award_name,
        "user_id": data.user_id,
    }).execute()
    return res.data[0]


@router.delete("/{league_id}/history/awards/{award_id}")
def delete_award(league_id: str, award_id: str, user_id: str = Depends(get_current_user_id)):
    league_res = supabase.table("leagues").select("commissioner_id").eq("id", league_id).execute()
    if not league_res.data or league_res.data[0]["commissioner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the commissioner can delete awards")
    supabase.table("league_awards").delete().eq("id", award_id).execute()
    return {"ok": True}


@router.post("/{league_id}/history/import-espn")
def import_espn_history(
    league_id: str,
    data: ESPNImport,
    user_id: str = Depends(get_current_user_id),
):
    league_res = supabase.table("leagues").select("commissioner_id").eq("id", league_id).execute()
    if not league_res.data or league_res.data[0]["commissioner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the commissioner can import history")

    url = f"https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{data.season}/segments/0/leagues/{data.espn_league_id}"

    cookies = {}
    if data.espn_s2:
        cookies["espn_s2"] = data.espn_s2
    if data.swid:
        cookies["SWID"] = data.swid

    try:
        res = requests.get(
            url,
            params={"view": ["mStandings", "mTeam"]},
            cookies=cookies,
            headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"},
            timeout=10,
        )
        
        res.raise_for_status()
        espn_data = res.json()
    except Exception as e:
        print(f"ESPN fetch error: {e}")
        raise HTTPException(
            status_code=502,
            detail="Failed to fetch ESPN data. Check league ID and cookies.",
        )





    teams = espn_data.get("teams", [])

    if not teams:
        raise HTTPException(
            status_code=404,
            detail="No teams found. Private league? Provide espn_s2 and SWID.",
        )

        def team_name(t: dict) -> str:
            return t.get("name") or t.get("abbrev", "Unknown")


    champion = next(
        (t for t in teams if t.get("rankCalculatedFinal") == 1),
        None,
    )
    if not champion:
        champion = max(
            teams,
            key=lambda t: t.get("record", {}).get("overall", {}).get("wins", 0),
            default=None,
        )

    high_scorer = max(
        teams,
        key=lambda t: t.get("record", {}).get("overall", {}).get("pointsFor", 0),
        default=None,
    )

    champion_name = team_name(champion) if champion else None
    high_scorer_name = team_name(high_scorer) if high_scorer else None
    high_scorer_points = (
        high_scorer.get("record", {}).get("overall", {}).get("pointsFor")
        if high_scorer
        else None
    )

    supabase.table("league_historical_seasons").upsert(
        {
            "league_id": league_id,
            "season": data.season,
            "champion_name": champion_name,
            "high_scorer_name": high_scorer_name,
            "high_scorer_points": high_scorer_points,
            "espn_league_id": data.espn_league_id,
        },
        on_conflict="league_id,season",
    ).execute()

    return {
        "season": data.season,
        "champion_name": champion_name,
        "high_scorer_name": high_scorer_name,
        "high_scorer_points": high_scorer_points,
    }
