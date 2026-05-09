from pydantic import BaseModel
from typing import Optional

class PlayerStats(BaseModel):
    id: str
    player_id: str
    week: int
    season: int
    passing_yards: int = 0
    passing_tds: int = 0 
    interceptions: int = 0
    rushing_yards: int = 0 
    receiving_yards: int = 0 
    receiving_tds: int = 0
    receptions: int = 0 
    return_tds: int = 0 
    two_point_conversions: int = 0
    fumbles_lost: int = 0 

class WeeklyScore(BaseModel):
    id: str
    league_id: str
    user_id: str
    week: int
    season: int
    total_points: float

class TeamScore(BaseModel):
    user_id: str
    total_points: float

    