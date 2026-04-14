
from fastapi import APIRouter, Depends
from app.models.profile import ProfileResponse, ProfileUpdate
from app.services.profile import get_profile, update_profile
from app.core.security import get_current_user_id

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/", response_model=ProfileResponse)
def fetch_profile(user_id: str = Depends(get_current_user_id)):
    return get_profile(user_id)

@router.patch("/", response_model=ProfileResponse)
def patch_profile(updates: ProfileUpdate, user_id: str = Depends(get_current_user_id)):
    return update_profile(user_id, updates)
