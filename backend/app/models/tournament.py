from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CreateTournamentRequest(BaseModel):
    name: str
    theme: Optional[str] = None
    entry_fee: int = 0


class VoteRequest(BaseModel):
    vote: str # "claude" or GPT4


class CustomPromptRequest(BaseModel):
    prompt: str


class TournamentResponse(BaseModel):
    id: str
    league_id: str
    name: str
    theme: Optional[str]
    entry_fee: int
    status: str
    ai_brain: str
    scoring_rules: Optional[dict]
    created_at: datetime


class TournamentMatchupResponse(BaseModel):
    id: str
    tournament_id: str
    round: int
    home_user_id: str
    away_user_id: Optional[str]
    home_points: float
    away_points: float
    winner_user_id: Optional[str]
    commentary: Optional[str]
    