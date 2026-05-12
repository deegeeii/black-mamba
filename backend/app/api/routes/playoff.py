# backend/app/api/routes/playoff.py

from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user_id as get_current_user
from app.services import playoff as playoff_svc
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/leagues", tags=["playoffs"])


class AdvanceRequest(BaseModel):
    completed_week: int


class ScoreRequest(BaseModel):
    week: int


class SettingsRequest(BaseModel):
    playoff_teams: Optional[int] = None
    tiebreaker: Optional[str] = None


@router.post("/{league_id}/playoffs/bracket")
def generate_bracket(league_id: str, user=Depends(get_current_user)):
    data, err = playoff_svc.generate_bracket(league_id)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return data


@router.post("/{league_id}/playoffs/advance")
def advance_round(league_id: str, body: AdvanceRequest, user=Depends(get_current_user)):
    data, err = playoff_svc.advance_round(league_id, body.completed_week)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return data


@router.post("/{league_id}/playoffs/score")
def score_week(league_id: str, body: ScoreRequest, user=Depends(get_current_user)):
    data, err = playoff_svc.score_playoff_week(league_id, body.week)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return data


@router.get("/{league_id}/playoffs")
def get_playoffs(league_id: str, user=Depends(get_current_user)):
    return playoff_svc.get_playoff_matchups(league_id)


@router.patch("/{league_id}/playoffs/settings")
def update_settings(league_id: str, body: SettingsRequest, user=Depends(get_current_user)):
    data, err = playoff_svc.update_league_settings(league_id, user, body.playoff_teams, body.tiebreaker)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return data
