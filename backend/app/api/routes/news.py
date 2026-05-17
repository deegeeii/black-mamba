from fastapi import APIRouter
from app.services.news import get_headlines, get_scoreboard

router = APIRouter()

@router.get("/headlines")
def headlines():
    data, _ = get_headlines()
    return data

@router.get("/scoreboard")
def scoreboard():
    data, _ = get_scoreboard()
    return data
