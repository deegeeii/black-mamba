from fastapi import APIRouter, Depends, HTTPException
from app.models.roster import RosterPlayer, LineupSlot, SetLineupRequest
from app.services.roster import get_my_roster, get_lineup, set_lineup
from app.core.security import get_current_user_id
from typing import List

router = APIRouter(prefix="/leagues", tags=["roster"])

@router.get("/{league_id}/roster", response_model=List[RosterPlayer])
def fetch_roster(league_id: str, user_id: str = Depends(get_current_user_id)):
    return get_my_roster(league_id, user_id)

@router.get("/{league_id}/lineup", response_model=List[LineupSlot])
def fetch_lineup(league_id: str, week: int, user_id: str = Depends(get_current_user_id)):
    return get_lineup(league_id, user_id, week)

@router.post("/{league_id}/lineup", response_model=List[LineupSlot])
def save_lineup(league_id: str, data: SetLineupRequest, user_id: str = Depends(get_current_user_id)):
    if not data.slots:
        raise HTTPException(status_code=400, detail="No slots provided")
    return set_lineup(league_id, user_id, data.week, data.slots)
