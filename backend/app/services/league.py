
import random
import string 
from app.core.supabase import supabase
from app.models.league import LeagueCreate, JoinLeague

def generate_invite_code(length: int = 8) -> str:
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))

def create_league(user_id: str, data: LeagueCreate):
    invite_code = generate_invite_code()

    league = supabase.table("leagues").insert({
        "name": data.name,
        "commissioner_id": user_id,
        "scoring_type": data.scoring_type,
        "max_teams": int(data.max_teams),
        "invite_code": invite_code,
    }).execute()

    league_id = league.data[0]["id"]

    supabase.table("league_members").insert({
        "league_id": league_id,
        "user_id": user_id,
        "team_name": data.team_name,
    }).execute()

    return league.data[0]


def get_user_leagues(user_id: str):
    memberships = (
        supabase.table("league_members")
        .select("league_id")
        .eq("user_id", user_id)
        .execute()
    )

    league_ids = [m["league_id"] for m in memberships.data]

    if not league_ids:
        return []
    
    leagues = (
        supabase.table("leagues")
        .select("*")
        .in_("id", league_ids)
        .execute()
    )

    return leagues.data

def join_league(user_id: str, data: JoinLeague):
    league = (
        supabase.table("leagues")
        .select("*")
        .eq("invite_code", data.invite_code)
        .single()
        .execute()

    )

    if not league.data:
        return None
    
    supabase.table("league_members").insert({
        "league_id": league.data["id"],
        "user_id": user_id,
        "team_name": data.team_name,
    }).execute()

    return league.data