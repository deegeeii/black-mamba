# backend/app/services/notification.py

import httpx
from app.core.supabase import supabase
from app.services.email import send_notification_email


def _send_push(token: str, title: str, body: str):
    httpx.post(
        "https://exp.host/--/api/v2/push/send",
        json={
            "to": token,
            "title": title,
            "body": body,
            "sound": "default",
        },
        timeout=10,
    )


def create_notification(user_id: str, league_id: str, type: str, message: str):
    supabase.table("notifications").insert({
        "user_id": user_id,
        "league_id": league_id,
        "type": type,
        "message": message,
    }).execute()
    send_notification_email(user_id, type, message)
    profile = supabase.table("profiles").select("expo_push_token").eq("id", user_id).execute()
    if profile.data and profile.data[0].get("expo_push_token"):
        try:
            _send_push(profile.data[0]["expo_push_token"], type.replace("_", " ").title(), message)
        except Exception as e:
            print(f"[notification] push send failed for {user_id}: {e}")



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
