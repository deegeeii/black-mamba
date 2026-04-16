
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class PlayerResponse(BaseModel):
    id: str
    name: str
    position: str
    nfl_team: Optional[str] = None
    headshot_url: Optional[str] = None

class DraftSessionResponse(BaseModel):
    id: str
    league_id: str
    status: str
    draft_order: Optional[List[str]] = None
    current_pick: int
    total_rounds: int
    created_at: datetime

class DraftPickResponse(BaseModel):
    id: str
    draft_session_id: str
    league_id: str
    user_id: str
    player_id: str
    round: int
    pick_number: int
    created_at: datetime

class MakePickRequest(BaseModel):
    player_id: str
