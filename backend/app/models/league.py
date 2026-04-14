
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class LeagueCreate(BaseModel):
    name: str
    scoring_type: str
    max_teams: int = 12
    team_name: str

class LeagueResponse(BaseModel):
    id: str
    name: str
    commissioner_id: str
    scoring_type: str
    max_teams: int
    invite_code: str
    created_at: datetime

class LeagueMemberResponse(BaseModel):
    league_id: str
    user_id: str
    team_name: Optional[str] = None
    joined_at: datetime

class JoinLeague(BaseModel):
    invite_code: str
    team_name: str
    