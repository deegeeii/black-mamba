# backend/app/services/email.py

import resend
from app.core.supabase import supabase
from app.core.config import settings

resend.api_key = settings.resend_api_key


TEMPLATES = {
    "trade_offer":    ("New Trade Offer — Black Mamba", "You have a new trade offer waiting for your response."),
    "trade_accepted": ("Trade Accepted — Black Mamba",  "Your trade offer was accepted. Check your updated roster."),
    "trade_rejected": ("Trade Rejected — Black Mamba",  "Your trade offer was rejected."),
    "waiver_add":     ("Waiver Pickup — Black Mamba",   "A player was added to your roster."),
    "waiver_drop":    ("Waiver Drop — Black Mamba",     "A player was dropped from your roster."),
}


def _get_user_email(user_id: str):
    try:
        res = supabase.auth.admin.get_user_by_id(user_id)
        return res.user.email if res.user else None
    except Exception:
        return None


def send_notification_email(user_id: str, notif_type: str, message: str):
    if not resend.api_key:
        return

    email = _get_user_email(user_id)
    if not email:
        return

    subject, preview = TEMPLATES.get(notif_type, ("Black Mamba Notification", message))

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#111;color:#eee;padding:32px;border-radius:8px;">
        <h2 style="color:#00cc66;letter-spacing:2px;margin-bottom:8px;">BLACK MAMBA</h2>
        <hr style="border-color:#333;margin-bottom:24px;"/>
        <p style="font-size:16px;margin-bottom:8px;">{message}</p>
        <p style="color:#888;font-size:13px;">{preview}</p>
        <a href="https://blackmambafantasysports.com" style="display:inline-block;margin-top:24px;padding:10px 20px;background:#00cc66;color:#000;border-radius:6px;text-decoration:none;font-weight:bold;">Open Black Mamba</a>

    </div>
    """

    try:
        resend.Emails.send({
            "from": "Black Mamba <hello@blackmambafantasysports.com>",
            "to": [email],
            "subject": subject,
            "html": html,
        })
    except Exception as e:
        print(f"[email error] {e}")

