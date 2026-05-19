from fastapi import APIRouter, Depends, HTTPException, Request, Header
from typing import Optional
from pydantic import BaseModel
from app.core.security import get_current_user_id as get_current_user
from app.services import stripe_connect as svc
from app.core.config import settings
from app.core.supabase import supabase

router = APIRouter(prefix="/connect", tags=["stripe-connect"])


class CreateAccountRequest(BaseModel):
    display_name: str
    contact_email: str


@router.post("/accounts")
def create_account(data: CreateAccountRequest, user_id: str = Depends(get_current_user)):
    account_id, err = svc.create_connected_account(user_id, data.display_name, data.contact_email)
    if err:
        raise HTTPException(400, err)
    return {"account_id": account_id}


@router.post("/accounts/onboard")
def onboard(user_id: str = Depends(get_current_user)):
    profile = supabase.table("profiles").select("stripe_account_id").eq("id", user_id).execute()
    if not profile.data or not profile.data[0].get("stripe_account_id"):
        raise HTTPException(400, "No connected account. Create one first.")
    url, err = svc.create_account_link(
        profile.data[0]["stripe_account_id"],
        "https://blackmambafantasysports.com"
    )
    if err:
        raise HTTPException(400, err)
    return {"url": url}


@router.get("/accounts/status")
def status(user_id: str = Depends(get_current_user)):
    profile = supabase.table("profiles").select("stripe_account_id").eq("id", user_id).execute()
    if not profile.data or not profile.data[0].get("stripe_account_id"):
        return {"has_account": False}
    result, err = svc.get_account_status(profile.data[0]["stripe_account_id"])
    if err:
        raise HTTPException(400, err)
    return {"has_account": True, **result}


@router.post("/webhook")
async def webhook(request: Request, stripe_signature: Optional[str] = Header(None)):
    payload = await request.body()
    secret = settings.stripe_connect_webhook_secret
    if not secret:
        return {"received": True, "warning": "Webhook secret not configured"}
    if not stripe_signature:
        raise HTTPException(400, "Missing Stripe-Signature header")
    try:
        return svc.handle_thin_event(payload, stripe_signature, secret)
    except Exception as e:
        raise HTTPException(400, str(e))
