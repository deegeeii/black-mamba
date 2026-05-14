# backend/app/services/notification.py

from app.core.supabase import supabase
from app.services.email import send_notification_email



def create_notification(user_id: str, league_id: str, type: str, message: str):
    supabase.table("notifications").insert({
        "user_id": user_id,
        "league_id": league_id,
        "type": type,
        "message": message,
    }).execute()
    send_notification_email(user_id, type, message)


def get_notifications(user_id: str, league_id: str):
    print(f"get_notifications called with user_id={user_id}, league_id={league_id}")
    res = (
        supabase.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .eq("league_id", league_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return res.data or []


def mark_read(user_id: str, notification_ids: list):
    supabase.table("notifications").update({"read": True}).in_("id", notification_ids).eq("user_id", user_id).execute()
    return {"ok": True}


def mark_all_read(user_id: str, league_id: str):
    supabase.table("notifications").update({"read": True}).eq("user_id", user_id).eq("league_id", league_id).execute()
    return {"ok": True}
