
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.supabase import supabase

security = HTTPBearer()

def get_current_user_id(
        credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    token = credentials.credentials
    response = supabase.auth.get_user(token)
    if not response.user:
        raise HTTPException(status_code=401, detail="Ivalid or expired token")
    return response.user.id
