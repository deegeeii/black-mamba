from fastapi import APIRouter, Depends, HTTPException
from app.models.scoring import WeeklyScore, TeamScore
from app.services.scoring import get_weekly_scores, get_my_score, sync_scores
from app.services.stats import fetch_and_cache_stats
from app.services.chat import bot_post
from app.core.security import get_current_user_id
from typing import List

router = APIRouter(prefix="/leagues", tags=["scoring"])
stats_router = APIRouter(prefix="/scoring", tags=["scoring"])

@stats_router.post("/stats/sync")
def sync_stats(week: int):
    count = fetch_and_cache_stats(week)
    return {"players_synced": count}

@router.post("/{league_id}/scores/sync")
def sync_weekly_scores(league_id: str, week: int, user_id: str = Depends(get_current_user_id)):
    result, error = sync_scores(league_id, week)
    if error:
        raise HTTPException(status_code=400, detail=error)
    bot_post(league_id, "score_sync", f"Week {week} scores just synced. {len(result)} teams updated — check the standings.")
    return {"synced": len(result)}

@router.get("/{league_id}/scores", response_model=List[TeamScore])
def fetch_weekly_scores(league_id: str, week: int, user_id: str = Depends(get_current_user_id)):
    return get_weekly_scores(league_id, week)

@router.get("/{league_id}/scores/me", response_model=WeeklyScore)
def fetch_my_score(league_id: str, week: int, user_id: str = Depends(get_current_user_id)):
    score = get_my_score(league_id, user_id, week)
    if not score:
        raise HTTPException(status_code=404, detail="No score found for this week")
    return score
