from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.core.security import get_current_user_id as get_current_user
from app.models.tournament import CreateTournamentRequest, VoteRequest, CustomPromptRequest
from app.services import tournament as svc

router = APIRouter(prefix="/leagues", tags=["tournaments"])


@router.post("/{league_id}/tournaments")
def create(league_id: str, data: CreateTournamentRequest, user_id: str = Depends(get_current_user)):
    result, err = svc.create_tournament(league_id, user_id, data)
    if err:
        raise HTTPException(400, err)
    return result


@router.get("/{league_id}/tournaments")
def list_all(league_id: str, user_id: str = Depends(get_current_user)):
    return svc.list_tournaments(league_id)


@router.post("/tournaments/{tournament_id}/join")
def join(tournament_id: str, user_id: str = Depends(get_current_user)):
    result, err = svc.join_tournament(tournament_id, user_id)
    if err:
        raise HTTPException(400, err)
    return result


@router.post("/tournaments/{tournament_id}/vote")
def vote(tournament_id: str, data: VoteRequest, user_id: str = Depends(get_current_user)):
    return svc.vote_ai_brain(tournament_id, user_id, data.vote)


@router.post("/tournaments/{tournament_id}/generate")
def generate(tournament_id: str, user_id: str = Depends(get_current_user)):
    result, err = svc.generate_bracket(tournament_id)
    if err:
        raise HTTPException(400, err)
    return result


@router.get("/tournaments/{tournament_id}/matchups")
def get_matchups(tournament_id: str, user_id: str = Depends(get_current_user)):
    from app.core.supabase import supabase
    res = supabase.table("tournament_matchups").select("*").eq("tournament_id", tournament_id).order("round").execute()
    return res.data


@router.post("/tournaments/{tournament_id}/matchups/{matchup_id}/commentary")
def commentary(tournament_id: str, matchup_id: str, data: Optional[CustomPromptRequest] = None, user_id: str = Depends(get_current_user)):
    custom = data.prompt if data else ""
    result, err = svc.get_commentary(tournament_id, matchup_id, custom)
    if err:
        raise HTTPException(400, err)
    return result


@router.get("/tournaments/{tournament_id}/matchups/{matchup_id}/predict")
def predict(tournament_id: str, matchup_id: str, user_id: str = Depends(get_current_user)):
    result, err = svc.predict_winner(tournament_id, matchup_id)
    if err:
        raise HTTPException(400, err)
    return result


@router.post("/tournaments/{tournament_id}/draft/generate")
def generate_draft_entities(tournament_id: str, user_id: str = Depends(get_current_user)):
    from app.services.tournament_draft import generate_entities
    result, err = generate_entities(tournament_id)
    if err:
        raise HTTPException(400, err)
    return result


@router.get("/tournaments/{tournament_id}/draft/entities")
def get_draft_entities(tournament_id: str, user_id: str = Depends(get_current_user)):
    from app.services.tournament_draft import get_entities
    return get_entities(tournament_id)


@router.post("/tournaments/{tournament_id}/draft/pick/{entity_id}")
def pick_entity(tournament_id: str, entity_id: str, user_id: str = Depends(get_current_user)):
    from app.services.tournament_draft import make_pick
    result, err = make_pick(tournament_id, entity_id, user_id)
    if err:
        raise HTTPException(400, err)
    return result
