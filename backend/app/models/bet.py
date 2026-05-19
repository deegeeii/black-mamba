from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class CreateBetRequest(BaseModel):
    bet_category: str = 'h2h'          # 'h2h' | 'pool'
    bet_type: str                        # weekly_matchup | season_long | custom
    proposition: str                     # what you're betting on
    amount: int                          # in cents (minimum entry for pool)
    settle_mode: str = 'manual'          # 'manual' | 'auto'
    outcome_options: Optional[List[str]] = None  # pool: ['Yes','No'] or ['Team A','Team B']
    opponent_id: Optional[str] = None   # h2h only
    week: Optional[int] = None


class EnterPoolBetRequest(BaseModel):
    side: str
    amount: int  # in cents, >= bet minimum


class SettleBetRequest(BaseModel):
    winning_side: str  # h2h: winner user_id | pool: one of outcome_options


class BetResponse(BaseModel):
    id: str
    league_id: str
    proposer_id: str
    opponent_id: Optional[str] = None
    bet_category: str
    bet_type: str
    proposition: Optional[str] = None
    amount: int
    week: Optional[int] = None
    settle_mode: str
    outcome_options: Optional[list] = None
    winning_side: Optional[str] = None
    status: str
    winner_id: Optional[str] = None
    payout_owed: int = 0
    rake_percent: float
    created_at: datetime


class ClientSecretResponse(BaseModel):
    bet_id: str
    client_secret: Optional[str] = None
