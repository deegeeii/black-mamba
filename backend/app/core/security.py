
from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.supabase import supabase

security = HTTPBearer()

def get_current_user_id(
        credentials: HTTPAuthorizationCredentials = Security(security)
) -> str:
    token = credentials.credentials
    try:
        response = supabase.auth.get_user(token)
    except Exception:
        try:
            response = supabase.auth.get_user(token)
        except Exception:
            raise HTTPException(status_code=401, detail="Authentication failed")
    if not response.user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return response.user.id
