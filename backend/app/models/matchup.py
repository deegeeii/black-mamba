from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Matchup(BaseModel):
    id: str
    league_id: str
    week: int
    season: int
    home_user_id: str
    away_user_id: str
    home_points: float
    away_points: float
    winner_user_id: Optional[str] = None
    created_at: datetime

class StandingEntry(BaseModel):
    user_id: str
    wins: int
    losses: int
    points_for: float

