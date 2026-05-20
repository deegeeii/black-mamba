// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function JoinLeague() {

    // ── Context ───────────────────────────────────────────────────────────────
    const navigate = useNavigate()
    const { session } = useAuth()
    const { refreshLeagues } = useLeague()

    // ── State ─────────────────────────────────────────────────────────────────
    const [inviteCode, setInviteCode] = useState('')
    const [teamName, setTeamName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // ── Handler ───────────────────────────────────────────────────────────────
    const handleJoin = async () => {
        if (!inviteCode.trim() || !teamName.trim()) {
            setError('Please enter both an invite code and a team name.')
            return
        }
        setError('')
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/leagues/join`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invite_code: inviteCode.trim().toUpperCase(),
                    team_name: teamName.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.detail || 'Invalid invite code')
                return
            }
            await refreshLeagues()
            navigate('/dashboard')
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 24px',
        }}>
            <div style={{ width: '100%', maxWidth: '420px' }}>

                {/* ── Back ── */}
                <button
                    onClick={() => navigate('/onboarding')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        fontSize: '15px',
                        cursor: 'pointer',
                        padding: 0,
                        marginBottom: '32px',
                    }}
                >
                    ← Back
                </button>

                <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '10px' }}>Join a League</h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.6', marginBottom: '36px' }}>
                    Enter the invite code your commissioner shared with you.
                </p>

                {/* ── Invite Code ── */}
                <label style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase' as const,
                    marginBottom: '8px',
                }}>
                    INVITE CODE
                </label>
                <input
                    value={inviteCode}
                    onChange={e => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WP26RL7Z"
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '12px',
                        color: 'var(--accent)',
                        fontSize: '18px',
                        letterSpacing: '4px',
                        outline: 'none',
                        boxSizing: 'border-box' as const,
                        marginBottom: '20px',
                    }}
                />

                {/* ── Team Name ── */}
                <label style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase' as const,
                    marginBottom: '8px',
                }}>
                    YOUR TEAM NAME
                </label>
                <input
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    placeholder="e.g. Blitz Krieg"
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '12px',
                        color: 'var(--text)',
                        fontSize: '15px',
                        outline: 'none',
                        boxSizing: 'border-box' as const,
                    }}
                />

                {error && (
                    <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '12px' }}>{error}</p>
                )}

                {/* ── Join Button ── */}
                <button
                    onClick={handleJoin}
                    disabled={loading}
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--accent)',
                        color: '#000',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        padding: '14px',
                        fontWeight: 'bold',
                        fontSize: '15px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        marginTop: '32px',
                    }}
                >
                    {loading ? 'Joining...' : 'Join League'}
                </button>

            </div>
        </div>
    )
}
