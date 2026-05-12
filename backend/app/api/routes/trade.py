# backend/app/api/routes/trade.py

from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user_id as get_current_user
from app.services import trade as trade_svc
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/leagues", tags=["trades"])


class ProposeRequest(BaseModel):
    opponent_id: str
    offer_player_ids: List[str]
    request_player_ids: List[str]
    week: int


class RespondRequest(BaseModel):
    action: str  # accept | reject | cancel


@router.get("/{league_id}/trades")
def list_trades(league_id: str, user=Depends(get_current_user)):
    return trade_svc.get_trades(league_id, user)


@router.post("/{league_id}/trades")
def propose_trade(league_id: str, body: ProposeRequest, user=Depends(get_current_user)):
    data, err = trade_svc.propose_trade(
        league_id, user, body.opponent_id,
        body.offer_player_ids, body.request_player_ids, body.week
    )
    if err:
        raise HTTPException(status_code=400, detail=err)
    return data


@router.patch("/{league_id}/trades/{trade_id}")
def respond_trade(league_id: str, trade_id: str, body: RespondRequest, user=Depends(get_current_user)):
    data, err = trade_svc.respond_trade(trade_id, user, body.action)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return data
