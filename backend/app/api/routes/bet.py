from fastapi import APIRouter, Depends, HTTPException
from app.models.bet import CreateBetRequest, EnterPoolBetRequest, SettleBetRequest
from app.services.bet import create_bet, accept_bet, get_bets, settle_bet, enter_pool_bet, auto_settle_bet
from app.services.chat import bot_post
from app.core.security import get_current_user_id

router = APIRouter(prefix="/leagues", tags=["bets"])


@router.post("/{league_id}/bets")
def create_new_bet(league_id: str, data: CreateBetRequest, user_id: str = Depends(get_current_user_id)):
    bet, client_secret = create_bet(league_id, user_id, data)
    bot_post(league_id, "bet_placed", f"New bet posted: \"{data.proposition}\" — ${data.amount / 100:.2f}")
    return {"bet_id": bet["id"], "client_secret": client_secret}


@router.get("/{league_id}/bets")
def list_bets(league_id: str, user_id: str = Depends(get_current_user_id)):
    return get_bets(league_id)


@router.post("/{league_id}/bets/{bet_id}/accept")
def accept_existing_bet(league_id: str, bet_id: str, user_id: str = Depends(get_current_user_id)):
    bet, client_secret, error = accept_bet(bet_id, user_id)
    if error:
        raise HTTPException(400, error)
    bot_post(league_id, "bet_accepted", f"A bet was just accepted. Stakes are set.")
    return {"bet_id": bet["id"], "client_secret": client_secret}


@router.post("/{league_id}/bets/{bet_id}/enter")
def enter_pool(league_id: str, bet_id: str, data: EnterPoolBetRequest, user_id: str = Depends(get_current_user_id)):
    entry, client_secret, error = enter_pool_bet(bet_id, user_id, data.side, data.amount)
    if error:
        raise HTTPException(400, error)
    return {"entry_id": entry["id"], "client_secret": client_secret}


@router.post("/{league_id}/bets/{bet_id}/settle")
def settle_existing_bet(league_id: str, bet_id: str, data: SettleBetRequest, user_id: str = Depends(get_current_user_id)):
    result, error = settle_bet(bet_id, data.winning_side)
    if error:
        raise HTTPException(400, error)
    return result


@router.post("/{league_id}/bets/{bet_id}/auto-settle")
def auto_settle_existing_bet(league_id: str, bet_id: str, user_id: str = Depends(get_current_user_id)):
    result, error = auto_settle_bet(bet_id)
    if error:
        raise HTTPException(400, error)
    return result

@router.delete("/{league_id}/bets/{bet_id}")
def delete_bet(league_id: str, bet_id: str, user_id: str = Depends(get_current_user)):
    result, err = svc.delete_bet(bet_id, user_id)
    if err:
        raise HTTPException(400, err)
    return result


@router.delete("/{league_id}/bets/{bet_id}")
def delete_bet(league_id: str, bet_id: str, user_id: str = Depends(get_current_user)):
    result, err = svc.delete_bet(bet_id, user_id)
    if err:
        raise HTTPException(400, err)
    return result
