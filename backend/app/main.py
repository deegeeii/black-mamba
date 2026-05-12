
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.profile import router as profile_router
from app.api.routes.league import router as league_router
from app.api.routes.draft import router as draft_router
from app.api.routes.roster import router as roster_router
from app.api.routes.scoring import router as scoring_router, stats_router
from app.api.routes.matchup import router as matchup_router
from app.api.routes.bet import router as bet_router
from app.api.routes.tournament import router as tournament_router
from app.api.routes.chat import router as chat_router
from app.api.routes.waiver import router as waiver_router
from app.api.routes.trade import router as trade_router
from app.api.routes.playoff import router as playoff_router


app = FastAPI(title="Black Mamba API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile_router)
app.include_router(league_router)
app.include_router(draft_router)
app.include_router(roster_router)
app.include_router(scoring_router)
app.include_router(stats_router)
app.include_router(matchup_router)
app.include_router(bet_router)
app.include_router(tournament_router)
app.include_router(chat_router)
app.include_router(waiver_router)
app.include_router(trade_router)
app.include_router(playoff_router)


@app.get("/")
def health_check():
    return {"status": "Black Mamba API is live"}
