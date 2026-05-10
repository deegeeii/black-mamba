import stripe 
from app.core.config import settings
from app.core.supabase import supabase

stripe.api_key = settings.stripe_secret_key
RAKE_PERCENT = 10


def create_bet(league_id: str, proposer_id: str, data):
    intent = stripe.PaymentIntent.create(
        amount=data.amount,
        currency="usd",
        capture_method="manual",
        metadata={
            "league_id": league_id,
            "proposer_id": proposer_id,
            "bet_type": data.bet_type,
        }
    )

    res = supabase.table("bets").insert({
        "league_id": league_id,
        "proposer_id": proposer_id,
        "opponent_id": data.opponent_id,
        "bet_type": data.bet_type,
        "amount": data.amount,
        "week": data.week,
        "description": data.description,
        "proposer_payment_intent": intent.id,
        "rake_percent": RAKE_PERCENT,
    }).execute()

    return res.data[0], intent.client_secret


def accept_bet(bet_id: str, opponent_id: str):
    bet_res = supabase.table("bets").select("*").eq("id", bet_id).execute()
    if not bet_res.data:
        return None, None, "Bet not found"
    
    bet = bet_res.data[0]
    if bet["status"] != "pending":
        return None, None, "Bet is no longer pending"
    
    intent = stripe.PaymentIntent.create(
        amount=bet["amount"],
        currency="usd",
        capture_method="manual",
        metadata={"bet_id": bet_id, "opponent_id": opponent_id}
    )

    res = supabase.table("bets").update({
        "opponent_id": opponent_id,
        "opponent_payment_intent": intent.id,
        "status": "active",
    }).eq("id", bet_id).execute()

    return res.data[0], intent.client_secret, None


def get_bets(league_id: str):
    res = (
        supabase.table("bets")
        .select("*")
        .eq("league_id", league_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


def settle_bet(bet_id: str, winner_id: str):
    bet_res = supabase.table("bets").select("*").eq("id", bet_id).execute()
    if not bet_res.data:
        return None, "Bet not found"
    
    bet = bet_res.data[0]
    if bet["status"] != "active":
        return None, "Bet is not active"
    
    pot = bet["amount"] * 2
    rake = int(pot * bet["rake_percent"] / 100)
    payout = pot - rake

    stripe.PaymentIntent.capture(bet["proposer_payment_intent"])
    if bet["opponent_payment_intent"]:
        stripe.PaymentIntent.capture(bet["opponent_payment_intent"])

    res = supabase.table("bets").update({
        "status": "settled",
        "winner_id": winner_id,
    }).eq("id", bet_id).execute()

    return {"bet": res.data[0], "payout": payout, "rake": rake}, None
