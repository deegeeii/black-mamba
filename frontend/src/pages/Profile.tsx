
// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CSSProperties } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'


// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL

const NFL_TEAMS = [
    'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
    'DAL','DEN','DET','GB','HOU','IND','JAX','KC',
    'LAC','LAR','LV','MIA','MIN','NE','NO','NYG',
    'NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'
]

// ── INTERFACES / TYPES ────────────────────────────────────────────────────────
interface Profile {
    id: string
    username: string
    full_name: string | null
    favorite_team: string | null
    team_name: string | null
    podcast_1: string | null
    podcast_2: string | null
    podcast_3: string | null
    ai_brain: string
}

// ── STYLE CONSTANTS ───────────────────────────────────────────────────────────
const inputStyle: CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '10px',
    color: 'var(--text)',
    fontSize: '14px',
    marginTop: '6px',
}

const labelStyle: CSSProperties = {
    color: 'var(--text-dim)',
    fontSize: '12px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
}

const sectionStyle: CSSProperties = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
    marginBottom: '16px',
}

export default function Profile() {

    // ── STATE ─────────────────────────────────────────────────────────────────
    const { session } = useAuth()
    const { theme, toggleTheme } = useTheme()
    const [username, setUsername] = useState('')
    const [fullName, setFullName] = useState('')
    const [teamName, setTeamName] = useState('')
    const [favoriteTeam, setFavoriteTeam] = useState('')
    const [podcast1, setPodcast1] = useState('')
    const [podcast2, setPodcast2] = useState('')
    const [podcast3, setPodcast3] = useState('')
    const [aiBrain, setAiBrain] = useState('claude')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const navigate = useNavigate()
    const { refreshLeagues } = useLeague()
    const [joinCode, setJoinCode] = useState('')
    const [joinTeamName, setJoinTeamName] = useState('')
    const [joinLoading, setJoinLoading] = useState(false)
    const [joinError, setJoinError] = useState('')


    const [payoutStatus, setPayoutStatus] = useState<{ has_account: boolean; account_id?: string; ready_to_receive_payments?: boolean; onboarding_complete?: boolean; requirements_status?: string | null } | null>(null)
    const [payoutDisplayName, setPayoutDisplayName] = useState('')
    const [payoutEmail, setPayoutEmail] = useState('')
    const [payoutCreating, setPayoutCreating] = useState(false)
    const [payoutError, setPayoutError] = useState('')

    // ── EFFECTS / FETCH ON MOUNT ──────────────────────────────────────────────
    useEffect(() => {
        if (!session) return
        fetch(`${API_URL}/connect/accounts/status`, { headers: { Authorization: `Bearer ${session.access_token}` } })
            .then(r => r.json()).then(setPayoutStatus).catch(() => setPayoutStatus({ has_account: false }))
    }, [session])

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}` }),
        [session?.access_token]
    )

    useEffect(() => {
        if (!session) return
        axios.get(`${API_URL}/profile/`, { headers }).then(res => {
            const p: Profile = res.data
            setUsername(p.username || '')
            setFullName(p.full_name || '')
            setTeamName(p.team_name || '')
            setFavoriteTeam(p.favorite_team || '')
            setPodcast1(p.podcast_1 || '')
            setPodcast2(p.podcast_2 || '')
            setPodcast3(p.podcast_3 || '')
            setAiBrain(p.ai_brain || 'claude')
        }).catch(() => {}).finally(() => setLoading(false))
    }, [session, headers])

    // ── HANDLERS ──────────────────────────────────────────────────────────────
    async function handleCreatePayoutAccount() {
        if (!payoutDisplayName || !payoutEmail) return
        setPayoutCreating(true)
        setPayoutError('')
        try {
            const res = await fetch(`${API_URL}/connect/accounts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
                body: JSON.stringify({ display_name: payoutDisplayName, contact_email: payoutEmail }),
            })
            const data = await res.json()
            if (!res.ok) { setPayoutError(data.detail || 'Failed'); return }
            const status = await fetch(`${API_URL}/connect/accounts/status`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
            setPayoutStatus(await status.json())
        } catch { setPayoutError('Network error') }
        finally { setPayoutCreating(false) }
    }

    async function handleOnboard() {
        try {
            const res = await fetch(`${API_URL}/connect/accounts/onboard`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session?.access_token}` },
            })
            const data = await res.json()
            if (!res.ok) { setPayoutError(data.detail || 'Failed'); return }
            window.location.href = data.url
        } catch { setPayoutError('Network error') }
    }

    async function refreshPayoutStatus() {
        const res = await fetch(`${API_URL}/connect/accounts/status`, { headers: { Authorization: `Bearer ${session?.access_token}` } })
        setPayoutStatus(await res.json())
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')
        try {
            await axios.patch(`${API_URL}/profile/`, {
                username,
                full_name: fullName,
                team_name: teamName,
                favorite_team: favoriteTeam,
                podcast_1: podcast1,
                podcast_2: podcast2,
                podcast_3: podcast3,
                ai_brain: aiBrain,
            }, { headers })
            setMessage('Profile saved!')
        } catch {
            setMessage('Something went wrong.')
        } finally {
            setSaving(false)
        }
    }

    const handleJoinLeague = async () => {
        if (!joinCode.trim() || !joinTeamName.trim()) {
            setJoinError('Please enter both an invite code and a team name.')
            return
        }
        setJoinError('')
        setJoinLoading(true)
        try {
            const res = await fetch(`${API_URL}/leagues/join`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invite_code: joinCode.trim().toUpperCase(),
                    team_name: joinTeamName.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) { setJoinError(data.detail || 'Invalid invite code'); return }
            await refreshLeagues()
            setJoinCode('')
            setJoinTeamName('')
            navigate('/dashboard')
        } catch {
            setJoinError('Network error')
        } finally {
            setJoinLoading(false)
        }
    }


    if (loading) return <p>Loading profile...</p>

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: '600px' }}>

            {/* ── Page Header ── */}
            <h1 style={{ marginBottom: '4px' }}>Profile Settings</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>Manage your account and preferences</p>

            {/* ── Appearance Section (outside form so toggle is instant) ── */}
            <div style={sectionStyle}>
                <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '16px' }}>Appearance</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ color: 'var(--text)', fontSize: '14px' }}>Theme</div>
                        <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '2px' }}>
                            Currently: {theme === 'dark' ? 'Dark' : 'Light'}
                        </div>
                    </div>
                    <button
                        onClick={toggleTheme}
                        style={{
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            borderRadius: '20px',
                            padding: '8px 20px',
                            color: 'var(--accent)',
                            fontSize: '13px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            letterSpacing: '1px',
                        }}
                    >
                        {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                    </button>
                </div>
            </div>

            {/* ── Join League ── */}
            <div style={sectionStyle}>
                <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '16px' }}>Join a League</h3>
                <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>INVITE CODE</label>
                    <input
                        style={{ ...inputStyle, color: 'var(--accent)', letterSpacing: '3px', fontWeight: 'bold' }}
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="e.g. WP26RL7Z"
                    />
                </div>
                <div style={{ marginBottom: '12px' }}>
                    <label style={labelStyle}>YOUR TEAM NAME</label>
                    <input
                        style={inputStyle}
                        value={joinTeamName}
                        onChange={e => setJoinTeamName(e.target.value)}
                        placeholder="e.g. Blitz Krieg"
                    />
                </div>
                {joinError && <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>{joinError}</p>}
                <button
                    type="button"
                    onClick={handleJoinLeague}
                    disabled={joinLoading}
                    style={{
                        backgroundColor: 'var(--accent-sec)',
                        color: 'var(--btn-text)',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        padding: '10px 20px',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        cursor: joinLoading ? 'not-allowed' : 'pointer',
                        opacity: joinLoading ? 0.6 : 1,
                    }}
                >
                    {joinLoading ? 'Joining...' : 'Join League'}
                </button>
            </div>

            <form onSubmit={handleSave}>

                {/* ── Identity Section ── */}
                <div style={sectionStyle}>
                    <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '16px' }}>Identity</h3>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelStyle}>Username</label>
                        <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelStyle}>Full Name</label>
                        <input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Team Name</label>
                        <input style={inputStyle} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Mambas" />
                    </div>
                </div>

                {/* ── NFL Allegiance Section ── */}
                <div style={sectionStyle}>
                    <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '16px' }}>NFL Allegiance</h3>
                    <div>
                        <label style={labelStyle}>Favorite NFL Team</label>
                        <select style={inputStyle} value={favoriteTeam} onChange={e => setFavoriteTeam(e.target.value)}>
                            <option value="">— Select a team —</option>
                            {NFL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                {/* ── Top 3 Podcasts Section ── */}
                <div style={sectionStyle}>
                    <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '16px' }}>Top 3 Podcasts</h3>
                    {[
                        { label: 'Podcast #1', value: podcast1, set: setPodcast1 },
                        { label: 'Podcast #2', value: podcast2, set: setPodcast2 },
                        { label: 'Podcast #3', value: podcast3, set: setPodcast3 },
                    ].map(({ label, value, set }) => (
                        <div key={label} style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>{label}</label>
                            <input style={inputStyle} value={value} onChange={e => set(e.target.value)} placeholder="Podcast name" />
                        </div>
                    ))}
                </div>

                {/* ── AI Preference Section ── */}
                <div style={sectionStyle}>
                    <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '16px' }}>AI Preference</h3>
                    <div>
                        <label style={labelStyle}>Personal AI Assistant</label>
                        <select style={inputStyle} value={aiBrain} onChange={e => setAiBrain(e.target.value)}>
                            <option value="claude">Claude (Anthropic)</option>
                            <option value="gpt4">GPT-4 (OpenAI)</option>
                            <option value="none">None</option>
                        </select>
                    </div>
                </div>

                {/* ── Payouts Section ── */}
                <div style={sectionStyle}>
                    <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '16px' }}>Payouts</h3>
                    {payoutError && (
                        <p style={{ color: 'var(--danger)', fontSize: '13px', marginBottom: '12px' }}>{payoutError}</p>
                    )}
                    {!payoutStatus?.has_account ? (
                        <>
                            {/* ── Create Payout Account Form ── */}
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '12px' }}>
                                Set up a payout account to automatically receive bet winnings via Stripe.
                            </p>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={labelStyle}>Display Name</label>
                                <input style={inputStyle} placeholder="Your name or team name" value={payoutDisplayName} onChange={e => setPayoutDisplayName(e.target.value)} />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label style={labelStyle}>Contact Email</label>
                                <input style={inputStyle} type="email" placeholder="Email for Stripe" value={payoutEmail} onChange={e => setPayoutEmail(e.target.value)} />
                            </div>
                            <button
                                type="button"
                                onClick={handleCreatePayoutAccount}
                                disabled={payoutCreating}
                                style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 20px', color: 'var(--accent)', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {payoutCreating ? 'Creating...' : 'Create Payout Account'}
                            </button>
                        </>
                    ) : (
                        <>
                            {/* ── Existing Payout Account Status ── */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '13px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={labelStyle}>Account</span>
                                    <span style={{ fontFamily: 'monospace', color: 'var(--text)' }}>{payoutStatus.account_id}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={labelStyle}>Onboarding</span>
                                    <span style={{ color: payoutStatus.onboarding_complete ? 'var(--accent)' : 'var(--warning)', fontWeight: 600 }}>
                                        {payoutStatus.onboarding_complete ? '✓ Complete' : '⚠ Incomplete'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={labelStyle}>Transfers</span>
                                    <span style={{ color: payoutStatus.ready_to_receive_payments ? 'var(--accent)' : 'var(--warning)', fontWeight: 600 }}>
                                        {payoutStatus.ready_to_receive_payments ? '✓ Active' : '⏳ Pending'}
                                    </span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {!payoutStatus.onboarding_complete && (
                                    <button type="button" onClick={handleOnboard}
                                        style={{ backgroundColor: 'var(--accent-sec)', color: 'var(--btn-text)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' }}>
                                        Complete Onboarding →
                                    </button>
                                )}
                                <button type="button" onClick={refreshPayoutStatus}
                                    style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 20px', color: 'var(--text-dim)', fontSize: '13px', cursor: 'pointer' }}>
                                    Refresh
                                </button>
                            </div>
                            {payoutStatus.onboarding_complete && payoutStatus.ready_to_receive_payments && (
                                <p style={{ color: 'var(--accent)', fontSize: '12px', marginTop: '10px', marginBottom: 0 }}>
                                    ✓ You'll automatically receive winnings when bets settle.
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* ── Save Button ── */}
                {message && (
                    <p style={{ color: message.includes('saved') ? 'var(--accent)' : 'var(--danger)', marginBottom: '12px' }}>
                        {message}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={saving}
                    style={{ backgroundColor: 'var(--accent-sec)', color: 'var(--btn-text)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
                >
                    {saving ? 'Saving...' : 'Save Profile'}
                </button>
            </form>
        </div>
    )
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
// exported as default above
