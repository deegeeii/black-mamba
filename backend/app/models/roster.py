
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class RosterPlayer(BaseModel):
    player_id: str
    name: str
    position: str
    nfl_team: Optional[str] = None
    round: int
    pick_number: int

class LineupSlot(BaseModel):
    player_id: str
    name: str
    position: str
    nfl_team: Optional[str] = None
    round: int
    pick_number: int

class LineupSlot(BaseModel):
    id: str
    league_id: str
    user_id: str
    week: int
    player_id: str
    slot: str
    created_at: datetime

class SetLineupRequest(BaseModel):
    week: int
    slots: dict[str, str]  # { "QB": "player_id", "RB1": "player_id", ... }