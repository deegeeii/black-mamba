from fastapi import APIRouter, Depends, HTTPException
from app.models.matchup import Matchup, StandingEntry
from app.services.matchup import generate_matchups, get_matchups, score_matchups, get_standings
from app.core.security import get_current_user_id
from typing import List

router = APIRouter(prefix="/leagues", tags=["matchups"])

@router.post("/{league_id}/matchups/generate")
def generate(league_id: str, week: int, user_id: str = Depends(get_current_user_id)):
    result, error = generate_matchups(league_id, week)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"matchups_created": len(result)}

@router.get("/{league_id}/matchups", response_model=List[Matchup])
def fetch_matchups(league_id: str, week: int, user_id: str = Depends(get_current_user_id)):
    return get_matchups(league_id, week)

@router.post("/{league_id}/matchups/score")
def score(league_id: str, week: int, user_id: str = Depends(get_current_user_id)):
    result, error = score_matchups(league_id, week)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return {"scored": len(result)}

@router.get("/{league_id}/standings", response_model=List[StandingEntry])
def fetch_standings(league_id: str, user_id: str = Depends(get_current_user_id)):
    return get_standings(league_id)
