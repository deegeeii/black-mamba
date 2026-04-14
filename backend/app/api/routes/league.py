
from fastapi import APIRouter, Depends, HTTPException
from app.models.league import LeagueCreate, LeagueResponse, JoinLeague
from app.services.league import create_league, get_user_leagues, join_league
from app.core.security import get_current_user_id
from typing import List

router = APIRouter(prefix="/leagues", tags=["leagues"])

@router.post("/", response_model=LeagueResponse)
def create_new_league(data: LeagueCreate, user_id: str = Depends(get_current_user_id)):
    return create_league(user_id, data)

@router.get("/", response_model=List[LeagueResponse])
def fetch_user_leagues(user_id: str = Depends(get_current_user_id)):
    return get_user_leagues(user_id)

@router.post("/join", response_model=LeagueResponse)
def join_existing_league(data: JoinLeague, user_id: str = Depends(get_current_user_id)):
    league = join_league(user_id, data)
    if not league:
        raise HTTPException(status_code=404, detail="Invalid invite code")
    return league
