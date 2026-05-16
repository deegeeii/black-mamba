# backend/app/api/routes/waiver.py

from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.security import get_current_user_id as get_current_user
from app.services import waiver as waiver_svc
from app.core.supabase import supabase
from pydantic import BaseModel
from typing import Optional



router = APIRouter(prefix="/leagues", tags=["waiver"])


class AddRequest(BaseModel):
    player_id: str
    drop_player_id: Optional[str] = None
    week: int


class DropRequest(BaseModel):
    player_id: str
    week: int


@router.get("/{league_id}/free-agents")
def list_free_agents(
    league_id: str,
    position: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user=Depends(get_current_user),
):
    return waiver_svc.get_free_agents(league_id, position, search)


@router.post("/{league_id}/roster/add")
def add_player(league_id: str, body: AddRequest, user=Depends(get_current_user)):
    data, err = waiver_svc.add_player(league_id, user, body.player_id, body.drop_player_id, body.week)
    if err:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=err)
    return {"ok": True}


@router.post("/{league_id}/roster/drop")
def drop_player(league_id: str, body: DropRequest, user=Depends(get_current_user)):
    data, err = waiver_svc.drop_player(league_id, user, body.player_id, body.week)
    if err:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=err)
    return {"ok": True}


@router.get("/{league_id}/activity")
def get_league_activity(league_id: str, user_id: str = Depends(get_current_user)):
    moves_res = (
        supabase.table("roster_moves")
        .select("id, user_id, player_id, move_type, week, created_at")
        .eq("league_id", league_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    if not moves_res.data:
        return []

    player_ids = list({m["player_id"] for m in moves_res.data})
    user_ids = list({m["user_id"] for m in moves_res.data})

    players_res = (
        supabase.table("players")
        .select("id, name, position")
        .in_("id", player_ids)
        .execute()
    )
    players_map = {p["id"]: p for p in (players_res.data or [])}

    members_res = (
        supabase.table("league_members")
        .select("user_id, team_name")
        .eq("league_id", league_id)
        .in_("user_id", user_ids)
        .execute()
    )
    teams_map = {
        m["user_id"]: m.get("team_name") or "Unknown"
        for m in (members_res.data or [])
    }

    return [
        {
            "id": m["id"],
            "user_id": m["user_id"],
            "team_name": teams_map.get(m["user_id"], "Unknown"),
            "player_name": players_map.get(m["player_id"], {}).get("name", "Unknown"),
            "player_position": players_map.get(m["player_id"], {}).get("position", ""),
            "move_type": m["move_type"],
            "week": m["week"],
            "created_at": m["created_at"],
        }
        for m in moves_res.data
    ]
