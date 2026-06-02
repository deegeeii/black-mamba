import asyncio
import stripe
import anthropic
from app.core.config import settings
from app.core.supabase import supabase
from app.services.notification import create_notification

stripe.api_key = settings.stripe_secret_key
RAKE_PERCENT = 10

_anthropic = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key, timeout=60.0)


async def _ai_with_search(prompt: str) -> str:
    try:
        msg = await _anthropic.messages.create(
            model="claude-opus-4-7",
            max_tokens=256,
            tools=[{"type": "web_search_20250305", "name": "web_search"}],
            messages=[{"role": "user", "content": prompt}],
        )
        return "".join(block.text for block in msg.content if hasattr(block, "text")).strip()
    except Exception:
        msg = await _anthropic.messages.create(
            model="claude-opus-4-7",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text.strip()


def create_bet(league_id: str, proposer_id: str, data):
    bet_data = {
        "league_id": league_id,
        "proposer_id": proposer_id,
        "bet_category": data.bet_category,
        "bet_type": data.bet_type,
        "proposition": data.proposition,
        "amount": data.amount,
        "week": data.week,
        "settle_mode": data.settle_mode,
        "outcome_options": data.outcome_options,
        "rake_percent": RAKE_PERCENT,
    }

    if data.bet_category == "h2h":
        intent = stripe.PaymentIntent.create(
            amount=data.amount,
            currency="usd",
            capture_method="manual",
            metadata={"league_id": league_id, "proposer_id": proposer_id},
        )
        bet_data["opponent_id"] = data.opponent_id
        bet_data["proposer_payment_intent"] = intent.id

        res = supabase.table("bets").insert(bet_data).execute()
        bet = res.data[0]
        if data.opponent_id:
            create_notification(data.opponent_id, league_id, "bet_offer",
                f"You've been challenged: \"{data.proposition}\"")
        return bet, intent.client_secret

    else:  # pool
        bet_data["status"] = "open"
        res = supabase.table("bets").insert(bet_data).execute()
        return res.data[0], None


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
        metadata={"bet_id": bet_id, "opponent_id": opponent_id},
    )

    res = supabase.table("bets").update({
        "opponent_id": opponent_id,
        "opponent_payment_intent": intent.id,
        "status": "active",
    }).eq("id", bet_id).execute()

    create_notification(bet["proposer_id"], bet["league_id"], "bet_accepted",
        f"Your bet was accepted: \"{bet['proposition']}\"")
    return res.data[0], intent.client_secret, None


def enter_pool_bet(bet_id: str, user_id: str, side: str, amount: int):
    bet_res = supabase.table("bets").select("*").eq("id", bet_id).execute()
    if not bet_res.data:
        return None, None, "Bet not found"
    bet = bet_res.data[0]

    if bet["bet_category"] != "pool":
        return None, None, "Not a pool bet"
    if bet["status"] != "open":
        return None, None, "Pool is no longer open"
    if amount < bet["amount"]:
        return None, None, f"Minimum entry is ${bet['amount'] / 100:.2f}"

    options = bet.get("outcome_options") or []
    if options and side not in options:
        return None, None, f"Invalid side. Options: {options}"

    existing = supabase.table("bet_entries").select("id").eq("bet_id", bet_id).eq("user_id", user_id).execute()
    if existing.data:
        return None, None, "Already entered this pool"

    intent = stripe.PaymentIntent.create(
        amount=amount,
        currency="usd",
        capture_method="manual",
        metadata={"bet_id": bet_id, "user_id": user_id, "side": side},
    )

    res = supabase.table("bet_entries").insert({
        "bet_id": bet_id,
        "user_id": user_id,
        "side": side,
        "amount": amount,
        "payment_intent_id": intent.id,
    }).execute()

    return res.data[0], intent.client_secret, None


def get_bets(league_id: str):
    bets_res = supabase.table("bets").select("*").eq("league_id", league_id).order("created_at", desc=True).execute()
    bets = bets_res.data
    if not bets:
        return []

    pool_ids = [b["id"] for b in bets if b.get("bet_category") == "pool"]
    entries_by_bet: dict = {}
    if pool_ids:
        entries_res = supabase.table("bet_entries").select("*").in_("bet_id", pool_ids).execute()
        for e in entries_res.data:
            entries_by_bet.setdefault(e["bet_id"], []).append(e)

    for bet in bets:
        bet["entries"] = entries_by_bet.get(bet["id"], [])

    return bets


def _settle_h2h(bet: dict, winning_side: str):
    winner_id = winning_side
    loser_id = bet["opponent_id"] if winner_id == bet["proposer_id"] else bet["proposer_id"]
    winner_intent = bet["proposer_payment_intent"] if winner_id == bet["proposer_id"] else bet.get("opponent_payment_intent")
    loser_intent = bet.get("opponent_payment_intent") if winner_id == bet["proposer_id"] else bet["proposer_payment_intent"]

    if loser_intent:
        try:
            stripe.PaymentIntent.capture(loser_intent)
        except Exception:
            pass
    if winner_intent:
        try:
            stripe.PaymentIntent.cancel(winner_intent)
        except Exception:
            pass

    rake = int(bet["amount"] * RAKE_PERCENT / 100)
    payout_owed = bet["amount"] - rake

    transfer_id = None
    winner_profile = supabase.table("profiles").select("stripe_account_id").eq("id", winner_id).execute()
    if winner_profile.data and winner_profile.data[0].get("stripe_account_id"):
        from app.services.stripe_connect import transfer_winnings
        transfer_id, _ = transfer_winnings(winner_profile.data[0]["stripe_account_id"], payout_owed, bet["id"])

    res = supabase.table("bets").update({
        "status": "settled",
        "winner_id": winner_id,
        "winning_side": winning_side,
        "payout_owed": payout_owed,
        "transfer_id": transfer_id,
    }).eq("id", bet["id"]).execute()

    msg = f"You won: \"{bet['proposition']}\" — ${payout_owed / 100:.2f}"
    if transfer_id:
        msg += " (transferred to your Stripe account)"
    else:
        msg += " (set up payouts in the Payouts tab to receive automatically)"

    create_notification(winner_id, bet["league_id"], "bet_won", msg)
    create_notification(loser_id, bet["league_id"], "bet_lost", f"You lost: \"{bet['proposition']}\"")

    return {"bet": res.data[0], "payout_owed": payout_owed, "rake": rake, "transfer_id": transfer_id}, None


def settle_bet(bet_id: str, winning_side: str):
    bet_res = supabase.table("bets").select("*").eq("id", bet_id).execute()
    if not bet_res.data:
        return None, "Bet not found"
    bet = bet_res.data[0]
    if bet["status"] not in ("active", "open"):
        return None, "Bet is not active"

    if bet["bet_category"] == "h2h":
        return _settle_h2h(bet, winning_side)
    return _settle_pool(bet, winning_side)


async def auto_settle_bet(bet_id: str):
    bet_res = supabase.table("bets").select("*").eq("id", bet_id).execute()
    if not bet_res.data:
        return None, "Bet not found"
    bet = bet_res.data[0]

    options = bet.get("outcome_options") or ["Yes", "No"]
    options_str = ", ".join(f'"{o}"' for o in options)

    prompt = (
        f'Search the web for the current outcome of this proposition: "{bet["proposition"]}"\n\n'
        f"Possible outcomes: {options_str}\n\n"
        f"Return ONLY one of the exact outcome strings above, "
        f'or "undetermined" if the result is not yet known. No other text.'
    )

    result = (await _ai_with_search(prompt)).strip().strip('"').strip("'")

    if result.lower() == "undetermined":
        return None, "Outcome not yet determined"

    match = next((o for o in options if o.lower() == result.lower()), None)
    if not match:
        return None, f"Could not match result to known options"

    return await asyncio.to_thread(settle_bet, bet_id, match)


def delete_bet(bet_id: str, user_id: str):
    bet_res = supabase.table("bets").select("*").eq("id", bet_id).execute()
    if not bet_res.data:
        return None, "Bet not found"
    bet = bet_res.data[0]
    if bet["proposer_id"] != user_id:
        return None, "Only the proposer can delete a bet"
    if bet["status"] not in ("pending", "open"):
        return None, "Can only delete pending or open bets"
    if bet.get("proposer_payment_intent"):
        try:
            stripe.PaymentIntent.cancel(bet["proposer_payment_intent"])
        except Exception:
            pass
    supabase.table("bets").delete().eq("id", bet_id).execute()
    return {"deleted": True}, None
