from fastapi import APIRouter, Depends, HTTPException
from app.models.bet import CreateBetRequest, BetResponse, ClientSecretResponse
from app.services.bet import create_bet, accept_bet, get_bets, settle_bet
from app.services.chat import bot_post
from app.core.security import get_current_user_id
from typing import List

router = APIRouter(prefix="/leagues", tags=["bets"])

@router.post("/{league_id}/bets", response_model=ClientSecretResponse)
def create_new_bet(league_id: str, data: CreateBetRequest, user_id: str = Depends(get_current_user_id)):
    bet, client_secret = create_bet(league_id, user_id, data)
    bot_post(league_id, "bet_placed", f"A new {data.bet_type} bet of ${data.amount / 100:.2f} was just placed in the league.")
    return {"bet_id": bet["id"], "client_secret": client_secret}

@router.get("/{league_id}/bets", response_model=List[BetResponse])
def list_bets(league_id: str, user_id: str = Depends(get_current_user_id)):
    return get_bets(league_id)

@router.post("/{league_id}/bets/{bet_id}/accept", response_model=ClientSecretResponse)
def accept_existing_bet(league_id: str, bet_id: str, user_id: str = Depends(get_current_user_id)):
    bet, client_secret, error = accept_bet(bet_id, user_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    bot_post(league_id, "bet_accepted", f"A bet was just accepted in the league. The stakes are set — someone's paying up.")
    return {"bet_id": bet["id"], "client_secret": client_secret}

@router.post("/{league_id}/bets/{bet_id}/settle")
def settle_existing_bet(league_id: str, bet_id: str, winner_id: str, user_id: str = Depends(get_current_user_id)):
    result, error = settle_bet(bet_id, winner_id)
    if error:
        raise HTTPException(status_code=400, detail=error)
    return result
