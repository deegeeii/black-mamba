# backend/app/services/trade.py

from typing import Optional
from app.core.supabase import supabase
from app.services.waiver import _rostered_player_ids


def get_trades(league_id: str, user_id: str):
    res = (
        supabase.table("trades")
        .select("*")
        .eq("league_id", league_id)
        .or_(f"proposer_id.eq.{user_id},opponent_id.eq.{user_id}")
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []


def propose_trade(league_id: str, proposer_id: str, opponent_id: str, offer_player_ids: list, request_player_ids: list, week: int):
    roster_map = _rostered_player_ids(league_id)
    my_ids = roster_map.get(proposer_id, set())
    their_ids = roster_map.get(opponent_id, set())

    for pid in offer_player_ids:
        if pid not in my_ids:
            return None, f"Player {pid} not on your roster"
    for pid in request_player_ids:
        if pid not in their_ids:
            return None, f"Player {pid} not on opponent's roster"

    res = supabase.table("trades").insert({
        "league_id": league_id,
        "proposer_id": proposer_id,
        "opponent_id": opponent_id,
        "offer_player_ids": offer_player_ids,
        "request_player_ids": request_player_ids,
        "status": "pending",
        "week": week,
    }).execute()
    return res.data, None


def respond_trade(trade_id: str, user_id: str, action: str):
    trade_res = (
        supabase.table("trades")
        .select("*")
        .eq("id", trade_id)
        .execute()
    )
    if not trade_res.data:
        return None, "Trade not found"

    trade = trade_res.data[0]

    if trade["status"] != "pending":
        return None, "Trade is no longer pending"

    if action == "cancel":
        if trade["proposer_id"] != user_id:
            return None, "Only the proposer can cancel"
        supabase.table("trades").update({"status": "cancelled"}).eq("id", trade_id).execute()
        return {"ok": True}, None

    if trade["opponent_id"] != user_id:
        return None, "Only the opponent can accept or reject"

    if action == "reject":
        supabase.table("trades").update({"status": "rejected"}).eq("id", trade_id).execute()
        return {"ok": True}, None

    if action == "accept":
        league_id = trade["league_id"]
        week = trade["week"]
        proposer_id = trade["proposer_id"]
        opponent_id = trade["opponent_id"]

        moves = []
        for pid in trade["offer_player_ids"]:
            moves.append({"league_id": league_id, "user_id": proposer_id, "player_id": pid, "move_type": "drop", "week": week})
            moves.append({"league_id": league_id, "user_id": opponent_id, "player_id": pid, "move_type": "add", "week": week})
        for pid in trade["request_player_ids"]:
            moves.append({"league_id": league_id, "user_id": opponent_id, "player_id": pid, "move_type": "drop", "week": week})
            moves.append({"league_id": league_id, "user_id": proposer_id, "player_id": pid, "move_type": "add", "week": week})

        supabase.table("roster_moves").insert(moves).execute()
        supabase.table("trades").update({"status": "accepted"}).eq("id", trade_id).execute()
        return {"ok": True}, None

    return None, "Invalid action"
