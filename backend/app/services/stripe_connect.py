from stripe import StripeClient
from app.core.config import settings
from app.core.supabase import supabase


def _client() -> StripeClient:
    if not settings.stripe_secret_key:
        raise ValueError("STRIPE_SECRET_KEY is not set")
    return StripeClient(settings.stripe_secret_key)


def create_connected_account(user_id: str, display_name: str, contact_email: str):
    """Create a Stripe Express account for a user so they can receive bet winnings."""
    client = _client()
    try:
        account = client.v2.core.accounts.create({
            "display_name": display_name,
            "contact_email": contact_email,
            "identity": {"country": "us"},
            "dashboard": "express",
            "defaults": {
                "responsibilities": {
                    "fees_collector": "application",
                    "losses_collector": "application",
                }
            },
            "configuration": {
                "recipient": {
                    "capabilities": {
                        "stripe_balance": {
                            "stripe_transfers": {"requested": True}
                        }
                    }
                }
            },
        })
    except Exception as e:
        return None, str(e)

    supabase.table("profiles").update(
        {"stripe_account_id": account.id}
    ).eq("id", user_id).execute()

    return account.id, None


def create_account_link(stripe_account_id: str, base_url: str):
    """Generate a one-time Stripe-hosted KYC onboarding URL."""
    client = _client()
    
    try:
        link = client.v2.core.account_links.create({
            "account": stripe_account_id,
            "use_case": {
                "type": "account_onboarding",
                "account_onboarding": {
                    "configurations": ["recipient"],
                    "refresh_url": f"{base_url}/profile",
                    "return_url": f"{base_url}/profile",
                },
            },
        })
    except Exception as e:
        return None, str(e)
    return link.url, None


def get_account_status(stripe_account_id: str):
    """Fetch live account status from Stripe — never cached."""
    client = _client()
    try:
        account = client.v2.core.accounts.retrieve(
            stripe_account_id,
            {"include": ["configuration.recipient", "requirements"]},
        )
    except Exception as e:
        return None, str(e)

    try:
        ready = (
            account.configuration.recipient.capabilities
            .stripe_balance.stripe_transfers.status == "active"
        )
    except AttributeError:
        ready = False

    try:
        req_status = account.requirements.summary.minimum_deadline.status
    except AttributeError:
        req_status = None

    return {
        "account_id": stripe_account_id,
        "ready_to_receive_payments": ready,
        "onboarding_complete": req_status not in ("currently_due", "past_due"),
        "requirements_status": req_status,
    }, None


def transfer_winnings(stripe_account_id: str, amount_cents: int, bet_id: str):
    """Transfer winnings from platform Stripe balance to a winner's connected account."""
    client = _client()
    try:
        transfer = client.transfers.create({
            "amount": amount_cents,
            "currency": "usd",
            "destination": stripe_account_id,
            "metadata": {"bet_id": bet_id},
        })
    except Exception as e:
        return None, str(e)
    return transfer.id, None


def handle_thin_event(payload: bytes, sig: str, webhook_secret: str):
    """
    Parse V2 thin webhook events for connected account requirement changes.
    CLI test: stripe listen --thin-events 'v2.core.account[requirements].updated' \
              --forward-thin-to http://localhost:8000/connect/webhook
    """
    client = _client()
    thin_event = client.parse_thin_event(payload, sig, webhook_secret)
    event = client.v2.core.events.retrieve(thin_event.id)
    account_id = getattr(getattr(event, "related_object", None), "id", "unknown")

    if event.type == "v2.core.account[requirements].updated":
        print(f"[Connect] Requirements updated — account: {account_id}")
    elif "capability_status_updated" in event.type:
        print(f"[Connect] Capability status updated — account: {account_id}")

    return {"received": True}
