
from fastapi import APIRouter, Depends, HTTPException
from app.models.draft import PlayerResponse, DraftSessionResponse, DraftPickResponse, MakePickRequest
from app.services.draft import get_draft_session, start_draft, make_pick, get_draft_picks
from app.services.espn import fetch_and_cache_players, get_cached_players
from app.core.security import get_current_user_id
from typing import List

router = APIRouter(prefix="/draft", tags=["draft"])

@router.post("/players/sync", response_model=List[PlayerResponse])
def sync_players():
     return fetch_and_cache_players()

@router.get("/players", response_model=List[PlayerResponse])
def list_players(position: str = None):
    return get_cached_players(position)

@router.get("/{league_id}/session", response_model=DraftSessionResponse)
def fetch_session(league_id: str):
    session = get_draft_session(league_id)
    if not session:
        raise HTTPException(status_code=404, detail="No draft session found")
    return session

@router.post("/{league_id}/start", response_model=DraftSessionResponse)
def start_draft_session(league_id: str, user_id: str = Depends(get_current_user_id)):
    session, error = start_draft(league_id, user_id)
    if error:
        raise HTTPException(status_code=403, detail=error)
    return session

@router.post("/{league_id}/pick", response_model=DraftPickResponse)
def submit_pick(league_id: str, data: MakePickRequest, user_id: str = Depends(get_current_user_id)):
    pick, error = make_pick(league_id, user_id, data)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return pick

@router.get("/{league_id}/picks", response_model=List[DraftPickResponse])
def fetch_picks(league_id: str):
    return get_draft_picks(league_id)
