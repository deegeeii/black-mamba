
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes.profile import router as profile_router
from app.api.routes.league import router as league_router
from app.api.routes.draft import router as draft_router


app = FastAPI(title="Black Mamba API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vites' default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile_router)
app.include_router(league_router)
app.include_router(draft_router)


@app.get("/")
def health_check():
    return {"status": "Black Mamba API is live"}