# backend/app/api/routes/waiver.py

from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user_id as get_current_user
from app.services import waiver as waiver_svc
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
