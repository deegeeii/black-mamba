
from pydantic import BaseModel
from typing import Optional

class ProfileResponse(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    favorite_team: Optional[str] = None
    ai_brain: str = 'claude'

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    favorite_team: Optional[str] = None
    ai_brain: Optional[str] = None

