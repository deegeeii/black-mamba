from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CreateBetRequest(BaseModel):
    bet_type: str
    amount: int # in cents
    opponent_id: Optional[str] = None
    week: Optional[int] = None
    description: Optional[str] = None

class BetResponse(BaseModel):
    id: str
    league_id: str
    proposer_id: str
    opponent_id: Optional[str] = None
    bet_type: str
    amount: int
    week: Optional[int] = None
    description: Optional[str] = None
    status: str
    winner_id: Optional[str] = None
    proposer_payment_intent: Optional[str] = None
    opponent_payment_intent: Optional[str] = None
    rake_percent: float
    created_at: datetime

class ClientSecretResponse(BaseModel):
    bet_id: str
    client_secret: str
    