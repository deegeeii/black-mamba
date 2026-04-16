
import random
from app.core.supabase import supabase
from app.models.draft import MakePickRequest

def get_draft_session(league_id: str):
    res = (
        supabase.table("draft_sessions")
        .select("*")
        .eq("league_id", league_id)
        .execute()
    )
    return res.data[0] if res.data else None


def start_draft(league_id: str, commissioner_id: str):
    # Verify the user is the commisioner
    league = supabase.table("leagues").select("commissioner_id").eq("id", league_id).execute()
    if not league.data or league.data[0]["commissioner_id"] != commissioner_id:
        return None, "Only the commissioner can start the draft"

    # Get all league members and randomize draft order
    members = supabase.table("league_members").select("user_id").eq("league_id", league_id).execute()
    user_ids = [m["user_id"] for m in members.data]
    random.shuffle(user_ids)

    # Check if a session already exists
    existing = supabase.table("draft_sessions").select("id").eq("league_id", league_id).execute()
    if existing.data:
        # Update to active
        res = (
            supabase.table("draft_sessions")
            .update({"status": "active", "draft_order": user_ids, "current_pick": 1})
            .eq("league_id", league_id)
            .execute()
        )
        return res.data[0], None
    
     # Create new session
    res = supabase.table("draft_sessions").insert({
        "league_id": league_id,
        "status": "active",
        "draft_order": user_ids,
        "current_pick": 1,
        "total_rounds": 15,
    }).execute()
    return res.data[0], None

    

def get_current_drafter(session: dict) -> str:
    draft_order = session["draft_order"]
    current_pick = session["current_pick"]
    num_teams = len(draft_order)
    pick_index = current_pick - 1
    round_num = pick_index // num_teams

    # Snake Draft: reverse order on even rounds
    if round_num % 2 == 0:
        position = pick_index % num_teams
    else:
        position = num_teams - 1 - (pick_index % num_teams)

    return draft_order[position]

def make_pick(league_id: str, user_id: str, data: MakePickRequest):
    session = get_draft_session(league_id)
    if not session or session["status"] != "active":
        return None, "Draft is not active"
    
    current_drafter = get_current_drafter(session)
    if current_drafter != user_id:
        return None, "It is not your turn"
    
    # Check player isn't already picked
    already_picked = (
        supabase.table("draft_picks")
        .select("id")
        .eq("draft_session_id", session["id"])
        .eq("player_id", data.player_id)
        .execute()
    )
    if already_picked.data:
        return None, "Player already drafted"
    
    pick_number = session["current_pick"]
    num_teams = len(session["draft_order"])
    round_num = ((pick_number - 1) // num_teams) + 1

    # Record the pick
    pick = supabase.table("draft_picks").insert({
        "draft_session_id": session["id"],
        "league_id": league_id,
        "user_id": user_id,
        "player_id": data.player_id,
        "round": round_num,
        "pick_number": pick_number,
    }).execute()

    # Advance the pick counter or complete the draft
    total_picks = session["total_rounds"] * num_teams
    if pick_number >= total_picks:
        supabase.table("draft_sessions").update({"status": "completed"}).eq("id", session["id"]).execute()
    else:
        supabase.table("draft_sessions").update({"current_pick": pick_number + 1}).eq("id", session["id"]).execute()

    return pick.data[0], None


def get_draft_picks(league_id: str):
    return (
        supabase.table("draft_picks")
        .select("*")
        .eq("league_id", league_id)
        .order("pick_number")
        .execute()
        .data
    )