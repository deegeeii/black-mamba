
from app.core.supabase import supabase
from app.models.profile import ProfileUpdate

def get_profile(user_id: str):
    response = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    return response.data

def update_profile(user_id: str, updates: ProfileUpdate):
    data = {k: v for k, v in updates.model_dump().items() if v is not None}
    data["updated_at"] = "now()"
    response = (
        supabase.table("profiles")
        .update(data)
        .eq("id", user_id)
        .execute()
    )
    return response.data[0]

