
from pydantic import BaseModel
from typing import Optional

class ProfileResponse(BaseModel):
    id: str
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    team_name: Optional[str] = None
    favorite_team: Optional[str] = None
    podcast_1: Optional[str] = None
    podcast_2: Optional[str] = None
    podcast_3: Optional[str] = None
    theme_preference: Optional[str] = 'dark'
    ai_brain: str = 'claude'


class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    favorite_team: Optional[str] = None
    team_name: Optional[str] = None
    podcast_1: Optional[str] = None
    podcast_2: Optional[str] = None
    podcast_3: Optional[str] = None
    theme_preference: Optional[str] = None
    ai_brain: Optional[str] = None

