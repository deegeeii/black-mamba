// ── IMPORTS ──────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import axios from 'axios'
import { useLeague } from '../contexts/LeagueContext'

const API_URL = import.meta.env.VITE_API_URL
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

// ── INTERFACES ────────────────────────────────────────────────────────────────
interface BetEntry {
    id: string
    user_id: string
    side: string
    amount: number
    status: string
    payout_owed: number
}

interface Bet {
    id: string
    proposer_id: string
    opponent_id: string | null
    bet_category: string
    bet_type: string
    proposition: string
    amount: number
    week: number | null
    settle_mode: string
    outcome_options: string[] | null
    winning_side: string | null
    status: string
    winner_id: string | null
    payout_owed: number
    rake_percent: number
    entries: BetEntry[]
}

interface Member {
    user_id: string
}

// ── CONFIRM PAYMENT COMPONENT ─────────────────────────────────────────────────
// Shown after creating or accepting a bet — collects card info via Stripe Elements
function ConfirmPayment({ clientSecret, label, onSuccess }: { clientSecret: string; label: string; onSuccess: () => void }) {
    const stripe = useStripe()
    const elements = useElements()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleConfirm = async () => {
        if (!stripe || !elements) return
        setLoading(true)
        setError('')
        const card = elements.getElement(CardElement)
        if (!card) return
        const { error } = await stripe.confirmCardPayment(clientSecret, { payment_method: { card } })
        if (error) {
            setError(error.message || 'Payment failed')
            setLoading(false)
        } else {
            onSuccess()
        }
    }

    return (
        <div style={{ border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px', backgroundColor: 'var(--bg-card)' }}>
            {/* ── Payment Label ── */}
            <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>{label}</p>

            {/* ── Stripe Card Element ── */}
            <CardElement options={{ style: { base: { color: '#ffffff', backgroundColor: '#1a1a1a', fontSize: '15px', '::placeholder': { color: '#666' } }, invalid: { color: '#ff4444' } } }} />

            {/* ── Stripe Security Badge ── */}
            <p style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '8px', marginBottom: 0 }}>🔒 Secured by Stripe</p>

            {error && <p style={{ color: 'var(--danger)', marginTop: '8px' }}>{error}</p>}

            {/* ── Confirm Payment Button ── */}
            <button onClick={handleConfirm} disabled={loading} style={{ marginTop: '12px', backgroundColor: loading ? 'var(--border)' : 'var(--accent)', color: loading ? 'var(--text-dim)' : '#000', border: 'none', borderRadius: 'var(--radius)', padding: '8px 20px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                {loading ? 'Processing...' : 'Confirm Payment'}
            </button>
        </div>
    )
}

// ── BETS INNER COMPONENT ──────────────────────────────────────────────────────
// Wrapped by <Elements> below so it can use Stripe hooks
function BetsInner() {

    // ── AUTH & CONTEXT ────────────────────────────────────────────────────────
    const { leagueId } = useParams<{ leagueId: string }>()
    const { session, user } = useAuth()
    const { getTeamName, activeLeague } = useLeague()
    const isCommissioner = user?.id === activeLeague?.commissioner_id

    // ── STATE: BETS LIST ──────────────────────────────────────────────────────
    const [bets, setBets] = useState<Bet[]>([])
    const [members, setMembers] = useState<Member[]>([])
    const [loading, setLoading] = useState(true)
    const [pendingPayment, setPendingPayment] = useState<{ clientSecret: string; label: string } | null>(null)

    // ── STATE: CREATE FORM ────────────────────────────────────────────────────
    const [showCreate, setShowCreate] = useState(false)
    const [creating, setCreating] = useState(false)
    const [betCategory, setBetCategory] = useState('h2h')
    const [betType, setBetType] = useState('weekly_matchup')
    const [proposition, setProposition] = useState('')
    const [amount, setAmount] = useState('10')
    const [settleMode, setSettleMode] = useState('manual')
    const [outcomeOptions, setOutcomeOptions] = useState('Yes, No')
    const [opponentId, setOpponentId] = useState('')
    const [week, setWeek] = useState(1)

    // ── STATE: SETTLING ───────────────────────────────────────────────────────
    const [settlingBetId, setSettlingBetId] = useState<string | null>(null)
    const [settlingSide, setSettlingSide] = useState('')
    const [autoSettling, setAutoSettling] = useState<string | null>(null)

    // ── STATE: POOL ENTRY ─────────────────────────────────────────────────────
    const [enteringBetId, setEnteringBetId] = useState<string | null>(null)
    const [enterSide, setEnterSide] = useState('')
    const [enterAmount, setEnterAmount] = useState('')

    // ── STATE: PAYOUT ACCOUNT CHECK ───────────────────────────────────────────
    // Gates accept/enter — user must have a connected payout account set up first
    const [hasPayout, setHasPayout] = useState<boolean | null>(null)

    // ── HEADERS ───────────────────────────────────────────────────────────────
    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}` }),
        [session?.access_token]
    )

    // ── FETCH BETS ────────────────────────────────────────────────────────────
    const fetchBets = async () => {
        try {
            const res = await axios.get(`${API_URL}/leagues/${leagueId}/bets`, { headers })
            setBets(res.data)
        } catch {} finally { setLoading(false) }
    }

    // ── FETCH ON MOUNT ────────────────────────────────────────────────────────
    useEffect(() => {
        fetchBets()
        axios.get(`${API_URL}/leagues/${leagueId}/members`, { headers })
            .then(res => setMembers(res.data))
            .catch(() => {})
    }, [leagueId, headers])

    // ── PAYOUT ACCOUNT CHECK ──────────────────────────────────────────────────
    useEffect(() => {
        if (!session) return
        fetch(`${API_URL}/connect/accounts/status`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
        })
            .then(r => r.json())
            .then(d => setHasPayout(d.has_account && d.onboarding_complete))
            .catch(() => setHasPayout(false))
    }, [session])

    // ── HANDLER: CREATE BET ───────────────────────────────────────────────────
    const handleCreate = async () => {
        if (creating) return
        setCreating(true)
        try {
            const amountCents = Math.round(parseFloat(amount) * 100)
            const options = betCategory === 'pool'
                ? outcomeOptions.split(',').map(o => o.trim()).filter(Boolean)
                : null
            const res = await axios.post(`${API_URL}/leagues/${leagueId}/bets`, {
                bet_category: betCategory,
                bet_type: betType,
                proposition,
                amount: amountCents,
                settle_mode: settleMode,
                outcome_options: options,
                opponent_id: betCategory === 'h2h' && opponentId ? opponentId : null,
                week: betType === 'weekly_matchup' ? week : null,
            }, { headers })
            setShowCreate(false)
            setProposition(''); setAmount('10'); setOpponentId(''); setOutcomeOptions('Yes, No')
            if (res.data.client_secret) {
                setPendingPayment({ clientSecret: res.data.client_secret, label: 'Pay to place your bet' })
            }
            fetchBets()
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Failed to create bet')
        } finally {
            setCreating(false)
        }
    }

    // ── HANDLER: ACCEPT BET (H2H) ─────────────────────────────────────────────
    const handleAccept = async (betId: string) => {
        try {
            const res = await axios.post(`${API_URL}/leagues/${leagueId}/bets/${betId}/accept`, {}, { headers })
            if (res.data.client_secret) {
                setPendingPayment({ clientSecret: res.data.client_secret, label: 'Pay to accept this bet' })
            }
            fetchBets()
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Failed to accept bet')
        }
    }

    // ── HANDLER: ENTER POOL BET ───────────────────────────────────────────────
    const handleEnterPool = async (betId: string) => {
        try {
            const amountCents = Math.round(parseFloat(enterAmount) * 100)
            const res = await axios.post(`${API_URL}/leagues/${leagueId}/bets/${betId}/enter`, {
                side: enterSide,
                amount: amountCents,
            }, { headers })
            setEnteringBetId(null); setEnterSide(''); setEnterAmount('')
            if (res.data.client_secret) {
                setPendingPayment({ clientSecret: res.data.client_secret, label: `Pay to enter pool — ${enterSide}` })
            }
            fetchBets()
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Failed to enter pool')
        }
    }

    // ── HANDLER: MANUAL SETTLE ────────────────────────────────────────────────
    const handleSettle = async (betId: string) => {
        try {
            await axios.post(`${API_URL}/leagues/${leagueId}/bets/${betId}/settle`, { winning_side: settlingSide }, { headers })
            setSettlingBetId(null); setSettlingSide('')
            fetchBets()
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Failed to settle bet')
        }
    }

    // ── HANDLER: AUTO SETTLE (AI) ─────────────────────────────────────────────
    const handleAutoSettle = async (betId: string) => {
        setAutoSettling(betId)
        try {
            await axios.post(`${API_URL}/leagues/${leagueId}/bets/${betId}/auto-settle`, {}, { headers })
            fetchBets()
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Auto-settle failed — outcome may not be determined yet')
        } finally {
            setAutoSettling(null)
        }
    }

    // ── HANDLER: DELETE BET ───────────────────────────────────────────────────
    // Only proposer can delete; only works on pending/open bets
    const handleDelete = async (betId: string) => {
        if (!confirm('Delete this bet?')) return
        try {
            await axios.delete(`${API_URL}/leagues/${leagueId}/bets/${betId}`, { headers })
            fetchBets()
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Failed to delete bet')
        }
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────
    const label = (userId: string | null) => getTeamName(userId)
    const canSettle = (bet: Bet) => isCommissioner || bet.proposer_id === user?.id

    if (loading) return <p>Loading bets...</p>

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: '700px' }}>
            <h1 style={{ marginBottom: '4px' }}>Side Bets</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '20px' }}>H2H challenges and pool bets with real money on the line.</p>

            {/* ── New Bet Button ── */}
            <button onClick={() => setShowCreate(!showCreate)} style={{ backgroundColor: 'var(--accent-sec)', color: 'var(--btn-text)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '16px' }}>
                + New Bet
            </button>

            {/* ── Create Form ── */}
            {showCreate && (
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '20px' }}>
                    <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '16px' }}>Create a Bet</h3>

                    {/* ── Category Toggle: H2H vs Pool ── */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelSty}>Bet Type</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            {(['h2h', 'pool'] as const).map(c => (
                                <button key={c} onClick={() => setBetCategory(c)} style={{ flex: 1, padding: '8px', border: `1px solid ${betCategory === c ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', backgroundColor: betCategory === c ? 'var(--accent)' : 'var(--bg-input)', color: betCategory === c ? '#000' : 'var(--text)', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                    {c === 'h2h' ? 'Head to Head' : 'Pool Bet'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Proposition Input ── */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelSty}>Proposition</label>
                        <input value={proposition} onChange={e => setProposition(e.target.value)}
                            placeholder={betCategory === 'h2h' ? 'e.g. Chiefs beat Eagles Sunday' : 'e.g. Who wins the Super Bowl?'}
                            style={inputSty} />
                    </div>

                    {/* ── Pool: Outcome Options ── */}
                    {betCategory === 'pool' && (
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelSty}>Outcome Options (comma separated)</label>
                            <input value={outcomeOptions} onChange={e => setOutcomeOptions(e.target.value)}
                                placeholder="Yes, No  OR  Chiefs, Eagles"
                                style={inputSty} />
                        </div>
                    )}

                    {/* ── Amount Input ── */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelSty}>{betCategory === 'pool' ? 'Minimum Entry ($)' : 'Amount ($)'}</label>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" step="0.50" style={inputSty} />
                    </div>

                    {/* ── H2H: Opponent Selector ── */}
                    {betCategory === 'h2h' && (
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelSty}>Challenge (leave blank for open)</label>
                            <select value={opponentId} onChange={e => setOpponentId(e.target.value)} style={inputSty as any}>
                                <option value="">Anyone can accept</option>
                                {members.filter(m => m.user_id !== user?.id).map(m => (
                                    <option key={m.user_id} value={m.user_id}>{label(m.user_id)}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* ── Bet Category: Weekly / Season / Custom ── */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelSty}>Category</label>
                        <select value={betType} onChange={e => setBetType(e.target.value)} style={inputSty as any}>
                            <option value="weekly_matchup">Weekly Matchup</option>
                            <option value="season_long">Season Long</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>

                    {/* ── Week Picker (weekly only) ── */}
                    {betType === 'weekly_matchup' && (
                        <div style={{ marginBottom: '12px' }}>
                            <label style={labelSty}>Week</label>
                            <input type="number" value={week} onChange={e => setWeek(Number(e.target.value))} min={1} max={18} style={inputSty} />
                        </div>
                    )}

                    {/* ── Settlement Toggle: Manual vs Auto ── */}
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelSty}>Settlement</label>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                            {([['manual', 'Manual'], ['auto', 'Auto (AI looks it up)']] as const).map(([val, lbl]) => (
                                <button key={val} onClick={() => setSettleMode(val)} style={{ flex: 1, padding: '8px', border: `1px solid ${settleMode === val ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', backgroundColor: settleMode === val ? 'var(--accent)' : 'var(--bg-input)', color: settleMode === val ? '#000' : 'var(--text)', cursor: 'pointer', fontSize: '13px' }}>
                                    {lbl}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Create / Submit Button ── */}
                    <button onClick={handleCreate} disabled={creating} style={{ backgroundColor: creating ? 'var(--border)' : 'var(--accent)', color: creating ? 'var(--text-dim)' : '#000', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', cursor: creating ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                        {creating ? 'Creating...' : betCategory === 'h2h' ? 'Create & Pay' : 'Create Pool'}
                    </button>
                </div>
            )}

            {/* ── Pending Payment Form (shown after create or accept) ── */}
            {pendingPayment && (
                <ConfirmPayment
                    clientSecret={pendingPayment.clientSecret}
                    label={pendingPayment.label}
                    onSuccess={() => { setPendingPayment(null); fetchBets() }}
                />
            )}

            {/* ── Bets List ── */}
            {bets.length === 0
                ? <p style={{ color: 'var(--text-dim)' }}>No bets yet.</p>
                : bets.map(bet => (
                    <div key={bet.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px', marginBottom: '12px' }}>

                        {/* ── Bet Header: Category + Status ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ fontFamily: "'Oswald', sans-serif", color: 'var(--text-heading)', fontWeight: 'bold', textTransform: 'uppercase' as const, fontSize: '11px', letterSpacing: '1px' }}>
                                {bet.bet_category === 'pool' ? 'Pool' : 'H2H'} · {bet.bet_type.replace('_', ' ')}
                            </span>
                            <span style={{ color: bet.status === 'settled' ? 'var(--accent)' : bet.status === 'active' || bet.status === 'open' ? 'var(--warning)' : 'var(--text-dim)', fontSize: '12px' }}>{bet.status}</span>
                        </div>

                        {/* ── Proposition Text ── */}
                        <p style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '15px', marginBottom: '10px' }}>"{bet.proposition}"</p>

                        {/* ── H2H Details: participants + pot math ── */}
                        {bet.bet_category === 'h2h' && (
                            <>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '6px' }}>
                                    {label(bet.proposer_id)} vs {bet.opponent_id ? label(bet.opponent_id) : 'Open challenge'}
                                </p>
                                <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '8px' }}>
                                    ${(bet.amount / 100).toFixed(2)} each · pot ${(bet.amount * 2 / 100).toFixed(2)} · winner gets ${(bet.amount * 2 * (1 - bet.rake_percent / 100) / 100).toFixed(2)}
                                </p>
                            </>
                        )}

                        {/* ── Pool Details: sides, entries, pots ── */}
                        {bet.bet_category === 'pool' && (
                            <>
                                <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '8px' }}>
                                    Min entry ${(bet.amount / 100).toFixed(2)} · {bet.rake_percent}% rake · total pot ${((bet.entries || []).reduce((s, e) => s + e.amount, 0) / 100).toFixed(2)}
                                </p>
                                {/* ── Pool Sides ── */}
                                {(bet.outcome_options || []).map(side => {
                                    const sideEntries = (bet.entries || []).filter(e => e.side === side)
                                    const sidePot = sideEntries.reduce((s, e) => s + e.amount, 0)
                                    const isWinningSide = bet.winning_side === side
                                    return (
                                        <div key={side} style={{ backgroundColor: 'var(--bg-deep)', borderRadius: 'var(--radius)', padding: '10px 12px', marginBottom: '6px', border: isWinningSide ? '1px solid var(--accent)' : '1px solid transparent' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ color: isWinningSide ? 'var(--accent)' : 'var(--text)', fontWeight: 'bold', fontSize: '13px' }}>
                                                    {side} {isWinningSide ? '✓' : ''}
                                                </span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>${(sidePot / 100).toFixed(2)}</span>
                                            </div>
                                            {sideEntries.map(e => (
                                                <div key={e.id} style={{ color: 'var(--text-dim)', fontSize: '12px', paddingTop: '2px' }}>
                                                    {label(e.user_id)} — ${(e.amount / 100).toFixed(2)}
                                                    {e.status === 'won' && <span style={{ color: 'var(--accent)' }}> · payout ${(e.payout_owed / 100).toFixed(2)}</span>}
                                                    {e.status === 'lost' && <span style={{ color: 'var(--danger)' }}> · lost</span>}
                                                </div>
                                            ))}
                                            {sideEntries.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>No entries yet</div>}
                                        </div>
                                    )
                                })}
                            </>
                        )}

                        {bet.week && <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '4px' }}>Week {bet.week}</p>}
                        {bet.settle_mode === 'auto' && bet.status !== 'settled' && (
                            <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '8px' }}>Settlement: AI auto-detect</p>
                        )}

                        {/* ── Settled: Winner Display ── */}
                        {bet.status === 'settled' && bet.bet_category === 'h2h' && (
                            <p style={{ color: 'var(--accent)', fontSize: '13px', marginBottom: '8px' }}>
                                Winner: {label(bet.winner_id)} · ${(bet.payout_owed / 100).toFixed(2)} owed
                            </p>
                        )}

                        {/* ── Actions Bar ── */}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginTop: '10px' }}>

                            {/* ── Accept Button (H2H, not proposer) ── */}
                            {bet.bet_category === 'h2h' && bet.status === 'pending' && bet.proposer_id !== user?.id && (
                                hasPayout
                                    ? <button onClick={() => handleAccept(bet.id)} style={{ backgroundColor: 'var(--accent-sec)', color: 'var(--btn-text)', border: 'none', borderRadius: 'var(--radius)', padding: '7px 14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Accept Bet</button>
                                    : <span style={{ color: 'var(--text-dim)', fontSize: '12px', alignSelf: 'center' }}>Set up payouts in Profile to accept bets</span>
                            )}

                            {/* ── Enter Pool Button (pool, not already entered) ── */}
                            {bet.bet_category === 'pool' && bet.status === 'open' && enteringBetId !== bet.id &&
                                !(bet.entries || []).find(e => e.user_id === user?.id) && (
                                hasPayout
                                    ? <button onClick={() => { setEnteringBetId(bet.id); setEnterSide(bet.outcome_options?.[0] || '') }} style={{ backgroundColor: 'var(--accent-sec)', color: 'var(--btn-text)', border: 'none', borderRadius: 'var(--radius)', padding: '7px 14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Enter Pool</button>
                                    : <span style={{ color: 'var(--text-dim)', fontSize: '12px', alignSelf: 'center' }}>Set up payouts in Profile to enter pools</span>
                            )}

                            {/* ── Settle Button (commissioner or proposer) ── */}
                            {canSettle(bet) && bet.status !== 'settled' && settlingBetId !== bet.id && (
                                <>
                                    <button onClick={() => { setSettlingBetId(bet.id); setSettlingSide('') }}
                                        style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>Settle</button>
                                    {bet.settle_mode === 'auto' && (
                                        <button onClick={() => handleAutoSettle(bet.id)} disabled={autoSettling === bet.id}
                                            style={{ backgroundColor: 'var(--bg-input)', color: autoSettling === bet.id ? 'var(--text-dim)' : 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '7px 14px', cursor: autoSettling === bet.id ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                                            {autoSettling === bet.id ? 'Searching...' : 'Auto Settle'}
                                        </button>
                                    )}
                                </>
                            )}

                            {/* ── Delete Button (proposer only, pending/open only) ── */}
                            {bet.proposer_id === user?.id && ['pending', 'open'].includes(bet.status) && (
                                <button onClick={() => handleDelete(bet.id)}
                                    style={{ backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '7px 14px', cursor: 'pointer', fontSize: '13px' }}>
                                    Delete
                                </button>
                            )}
                        </div>

                        {/* ── Pool Entry Form (shown when Enter Pool is clicked) ── */}
                        {enteringBetId === bet.id && (
                            <div style={{ marginTop: '12px', padding: '14px', backgroundColor: 'var(--bg-deep)', borderRadius: 'var(--radius)' }}>
                                {/* ── Side Picker ── */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
                                    {(bet.outcome_options || []).map(side => (
                                        <button key={side} onClick={() => setEnterSide(side)}
                                            style={{ padding: '6px 14px', border: `1px solid ${enterSide === side ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', backgroundColor: enterSide === side ? 'var(--accent)' : 'var(--bg-input)', color: enterSide === side ? '#000' : 'var(--text)', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                            {side}
                                        </button>
                                    ))}
                                </div>
                                {/* ── Amount + Pay Button ── */}
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <div style={{ position: 'relative' as const, flex: 1 }}>
                                        <span style={{ position: 'absolute' as const, left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>$</span>
                                        <input type="number" value={enterAmount} onChange={e => setEnterAmount(e.target.value)}
                                            placeholder={(bet.amount / 100).toFixed(2)} min={(bet.amount / 100).toString()} step="0.50"
                                            style={{ ...inputSty, paddingLeft: '24px' }} />
                                    </div>
                                    <button onClick={() => handleEnterPool(bet.id)} disabled={!enterSide || !enterAmount}
                                        style={{ backgroundColor: !enterSide || !enterAmount ? 'var(--border)' : 'var(--accent)', color: !enterSide || !enterAmount ? 'var(--text-dim)' : '#000', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: !enterSide || !enterAmount ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Pay & Enter</button>
                                    <button onClick={() => setEnteringBetId(null)} style={{ backgroundColor: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                                </div>
                            </div>
                        )}

                        {/* ── Settle Form (shown when Settle is clicked) ── */}
                        {settlingBetId === bet.id && (
                            <div style={{ marginTop: '12px', padding: '14px', backgroundColor: 'var(--bg-deep)', borderRadius: 'var(--radius)' }}>
                                <label style={{ ...labelSty, display: 'block' as const, marginBottom: '8px' }}>Declare Winner</label>
                                {/* ── Winner Option Buttons ── */}
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                                    {(bet.bet_category === 'pool'
                                        ? (bet.outcome_options || [])
                                        : [bet.proposer_id, bet.opponent_id].filter(Boolean) as string[]
                                    ).map(opt => (
                                        <button key={opt} onClick={() => setSettlingSide(opt)}
                                            style={{ padding: '6px 14px', border: `1px solid ${settlingSide === opt ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', backgroundColor: settlingSide === opt ? 'var(--accent)' : 'var(--bg-input)', color: settlingSide === opt ? '#000' : 'var(--text)', cursor: 'pointer', fontSize: '13px' }}>
                                            {bet.bet_category === 'pool' ? opt : label(opt)}
                                        </button>
                                    ))}
                                    {/* ── Confirm Settle Button ── */}
                                    <button onClick={() => handleSettle(bet.id)} disabled={!settlingSide}
                                        style={{ backgroundColor: !settlingSide ? 'var(--border)' : 'var(--danger)', color: !settlingSide ? 'var(--text-dim)' : '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: !settlingSide ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Confirm</button>
                                    <button onClick={() => setSettlingBetId(null)} style={{ backgroundColor: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
                                </div>
                            </div>
                        )}

                    </div>
                ))
            }
        </div>
    )
}

// ── STYLE CONSTANTS ───────────────────────────────────────────────────────────
const labelSty: React.CSSProperties = { color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }
const inputSty: React.CSSProperties = { width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px', boxSizing: 'border-box' }

// ── ROOT EXPORT: Stripe Elements Wrapper ──────────────────────────────────────
// Elements must wrap BetsInner so useStripe/useElements hooks work inside ConfirmPayment
export default function Bets() {
    return (
        <Elements stripe={stripePromise}>
            <BetsInner />
        </Elements>
    )
}
