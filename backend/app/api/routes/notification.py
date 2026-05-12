# backend/app/api/routes/notification.py

from fastapi import APIRouter, Depends
from app.core.security import get_current_user_id as get_current_user
from app.services import notification as notif_svc
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/leagues", tags=["notifications"])

class MarkReadRequest(BaseModel):
    notification_ids: List[str]

@router.get("/{league_id}/notifications")
def list_notifications(league_id: str, user=Depends(get_current_user)):
    return notif_svc.get_notifications(user, league_id)

@router.patch("/{league_id}/notifications/read")
def mark_read(league_id: str, body: MarkReadRequest, user=Depends(get_current_user)):
    return notif_svc.mark_read(user, body.notification_ids)

@router.patch("/{league_id}/notifications/read-all")
def mark_all_read(league_id: str, user=Depends(get_current_user)):
    return notif_svc.mark_all_read(user, league_id)
