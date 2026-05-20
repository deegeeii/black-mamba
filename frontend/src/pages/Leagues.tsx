
// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const SCORING_LABELS: Record<string, string> = {
    standard: '0.5 PPR',
    standard_plus: '1 PPR · Superflex',
    dynasty: '1 PPR · Dynasty',
}

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function Leagues() {

    // ── Context ───────────────────────────────────────────────────────────────
    const navigate = useNavigate()
    const { user } = useAuth()
    const { leagues, setActiveLeague } = useLeague()

    // ── State ─────────────────────────────────────────────────────────────────
    const [copied, setCopied] = useState<string | null>(null)

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code)
        setCopied(code)
        setTimeout(() => setCopied(null), 2000)
    }

    const handleGoToLeague = (league: any) => {
        setActiveLeague(league)
        navigate(`/leagues/${league.id}/league-home`)
    }

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: '720px', color: 'var(--text)' }}>

            {/* ── Header ── */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '28px',
            }}>
                <div>
                    <h1 style={{ marginBottom: '4px' }}>My Leagues</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>
                        {leagues.length} {leagues.length === 1 ? 'league' : 'leagues'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => navigate('/join-league')}
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '10px 18px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                        }}
                    >
                        Join League
                    </button>
                    <button
                        onClick={() => navigate('/create-league')}
                        style={{
                            backgroundColor: 'var(--accent)',
                            color: '#000',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            padding: '10px 18px',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                        }}
                    >
                        + Create League
                    </button>
                </div>
            </div>

            {/* ── Empty State ── */}
            {leagues.length === 0 && (
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '48px',
                    textAlign: 'center',
                }}>
                    <p style={{ fontSize: '32px', marginBottom: '12px' }}>🏈</p>
                    <h2 style={{ marginBottom: '8px' }}>No leagues yet</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '24px' }}>
                        Create a new league or join one with an invite code.
                    </p>
                    <button
                        onClick={() => navigate('/create-league')}
                        style={{
                            backgroundColor: 'var(--accent)',
                            color: '#000',
                            border: 'none',
                            borderRadius: 'var(--radius)',
                            padding: '12px 24px',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            cursor: 'pointer',
                        }}
                    >
                        Create a League
                    </button>
                </div>
            )}

            {/* ── League Cards ── */}
            {leagues.map((league: any) => {
                const isCommissioner = league.commissioner_id === user?.id
                return (
                    <div
                        key={league.id}
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '20px 24px',
                            marginBottom: '14px',
                        }}
                    >
                        {/* ── League Name + Badge ── */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '14px',
                        }}>
                            <div>
                                <h2 style={{ fontSize: '18px', marginBottom: '6px' }}>{league.name}</h2>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        fontSize: '11px',
                                        border: '1px solid var(--border)',
                                        borderRadius: '10px',
                                        padding: '3px 10px',
                                        color: 'var(--text-muted)',
                                    }}>
                                        {SCORING_LABELS[league.scoring_type] || league.scoring_type}
                                    </span>
                                    {league.max_teams && (
                                        <span style={{
                                            fontSize: '11px',
                                            border: '1px solid var(--border)',
                                            borderRadius: '10px',
                                            padding: '3px 10px',
                                            color: 'var(--text-muted)',
                                        }}>
                                            {league.max_teams} teams
                                        </span>
                                    )}
                                    {isCommissioner && (
                                        <span style={{
                                            fontSize: '11px',
                                            border: '1px solid var(--accent)',
                                            borderRadius: '10px',
                                            padding: '3px 10px',
                                            color: 'var(--accent)',
                                        }}>
                                            Commissioner
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => handleGoToLeague(league)}
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'var(--accent)',
                                    border: '1px solid var(--accent)',
                                    borderRadius: 'var(--radius)',
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                Open →
                            </button>
                        </div>

                        {/* ── Invite Code ── */}
                        {league.invite_code && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: 'var(--bg)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '8px',
                                padding: '10px 14px',
                            }}>
                                <div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '10px', letterSpacing: '1px' }}>INVITE CODE</span>
                                    <p style={{
                                        color: 'var(--accent)',
                                        fontWeight: 'bold',
                                        fontSize: '18px',
                                        letterSpacing: '4px',
                                        margin: '2px 0 0 0',
                                    }}>
                                        {league.invite_code}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleCopy(league.invite_code)}
                                    style={{
                                        backgroundColor: copied === league.invite_code ? 'var(--accent)' : 'var(--bg-card)',
                                        color: copied === league.invite_code ? '#000' : 'var(--text-muted)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '6px',
                                        padding: '6px 14px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    {copied === league.invite_code ? 'Copied ✓' : 'Copy'}
                                </button>
                            </div>
                        )}
                    </div>
                )
            })}

        </div>
    )
}
