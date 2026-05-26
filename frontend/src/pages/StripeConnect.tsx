// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL

// ── INTERFACES / TYPES ─────────────────────────────────────────────────────────
interface AccountStatus {
  has_account: boolean
  account_id?: string
  ready_to_receive_payments?: boolean
  onboarding_complete?: boolean
  requirements_status?: string | null
}

// ── STYLE CONSTANTS ────────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: '8px',
  border: '1px solid var(--border-subtle)', background: 'var(--bg-card)',
  color: 'var(--text)', fontSize: '14px', boxSizing: 'border-box',
}
const btn: React.CSSProperties = {
  padding: '10px 20px', borderRadius: '8px', border: 'none',
  background: 'var(--accent)', color: '#000', fontWeight: 600,
  cursor: 'pointer', fontSize: '14px',
}
const card: React.CSSProperties = {
  background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
  borderRadius: '12px', padding: '24px', maxWidth: '560px',
}

export default function StripeConnect() {
  // ── STATE ────────────────────────────────────────────────────────────────────
  const { session } = useAuth()
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  }), [session])

  const [status, setStatus] = useState<AccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // ── EFFECTS / FETCH ON MOUNT ─────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/connect/accounts/status`, { headers })
      setStatus(await res.json())
    } catch {
      setStatus({ has_account: false })
    } finally {
      setLoading(false)
    }
  }, [headers])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  // ── HANDLERS ─────────────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!displayName || !contactEmail) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/connect/accounts`, {
        method: 'POST', headers,
        body: JSON.stringify({ display_name: displayName, contact_email: contactEmail }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Failed'); return }
      await fetchStatus()
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  async function handleOnboard() {
    try {
      const res = await fetch(`${API_URL}/connect/accounts/onboard`, { method: 'POST', headers })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Failed'); return }
      window.location.href = data.url
    } catch {
      setError('Network error')
    }
  }

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading...</p>

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div>
      <h2 style={{ color: 'var(--text)', marginBottom: '8px' }}>Payouts</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
        Set up your payout account to automatically receive bet winnings.
      </p>

      {/* ── Error Banner ── */}
      {error && (
        <div style={{ background: 'var(--accent-dark)', color: 'var(--danger)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* ── Payout Account Card ── */}
      <div style={card}>
        <h3 style={{ color: 'var(--text)', marginTop: 0 }}>Payout Account</h3>

        {/* ── Create Account Form ── */}
        {!status?.has_account ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: 0 }}>
              Create a Stripe account to receive winnings directly when bets settle. Without this, winnings are tracked but not automatically paid out.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input style={inp} placeholder="Your name or team name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              <input style={inp} type="email" placeholder="Contact email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
              {/* ── Create Account Button ── */}
              <button style={btn} onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Payout Account'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── Account Status Rows ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              <Row label="Account" value={<span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{status.account_id}</span>} />
              <Row label="Onboarding" value={
                <span style={{ color: status.onboarding_complete ? 'var(--accent)' : 'var(--warning)', fontWeight: 600 }}>
                  {status.onboarding_complete ? '✓ Complete' : '⚠ Incomplete'}
                </span>
              } />
              <Row label="Transfers" value={
                <span style={{ color: status.ready_to_receive_payments ? 'var(--accent)' : 'var(--warning)', fontWeight: 600 }}>
                  {status.ready_to_receive_payments ? '✓ Active' : '⏳ Pending'}
                </span>
              } />
              {status.requirements_status && (
                <Row label="Requirements" value={<span style={{ color: 'var(--warning)' }}>{status.requirements_status}</span>} />
              )}
            </div>

            {/* ── Onboarding / Status Actions ── */}
            {!status.onboarding_complete && (
              <button style={btn} onClick={handleOnboard}>Complete Onboarding →</button>
            )}
            {status.onboarding_complete && !status.ready_to_receive_payments && (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                Transfers are pending Stripe review — usually activates within minutes.
              </p>
            )}
            {status.onboarding_complete && status.ready_to_receive_payments && (
              <p style={{ color: 'var(--accent)', fontSize: '13px', margin: 0 }}>
                ✓ You'll automatically receive winnings when bets settle.
              </p>
            )}

            {/* ── Refresh Button ── */}
            <button
              style={{ ...btn, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text)', marginTop: '12px' }}
              onClick={fetchStatus}
            >
              Refresh Status
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}
