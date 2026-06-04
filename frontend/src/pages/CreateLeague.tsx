// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import SnakeWatermark from '../components/SnakeWatermark'


// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL

const SCORING_OPTIONS = [
    {
        key: 'standard',
        label: 'Standard',
        tag: '0.5 PPR',
        desc: 'Half-point per reception. The most popular format. Balanced between pass-heavy and run-heavy teams.',
    },
    {
        key: 'standard_plus',
        label: 'Standard+',
        tag: '1 PPR · Superflex',
        desc: 'Full point per reception plus a Superflex slot — start a second QB or any skill position. Higher scoring, more strategy.',
    },
    {
        key: 'dynasty',
        label: 'Dynasty',
        tag: '1 PPR · Keepers',
        desc: 'Full point per reception with keeper leagues. Build your roster across seasons. The deepest format.',
    },
]

const MAX_TEAMS_OPTIONS = [6, 8, 10, 12, 14, 16]

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function CreateLeague() {

    // ── Context ───────────────────────────────────────────────────────────────
    const navigate = useNavigate()
    const { session } = useAuth()
    const { refreshLeagues } = useLeague()

    // ── State ─────────────────────────────────────────────────────────────────
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [leagueName, setLeagueName] = useState('')
    const [teamName, setTeamName] = useState('')
    const [scoringType, setScoringType] = useState('standard')
    const [maxTeams, setMaxTeams] = useState(10)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [inviteCode, setInviteCode] = useState('')

    const headers = {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
    }

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleCreate = async () => {
        setError('')
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/leagues/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: leagueName.trim(),
                    team_name: teamName.trim(),
                    scoring_type: scoringType,
                    max_teams: maxTeams,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.detail || 'Could not create league')
                return
            }
            setInviteCode(data.invite_code)
            await refreshLeagues()
            setStep(3)
        } catch {
            setError('Network error')
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(inviteCode)
    }

    // ── SHARED STYLES ──────────────────────────────────────────────────────────
    const pageStyle: React.CSSProperties = {
        minHeight: '100vh',
        backgroundColor: 'var(--bg-deep)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '60px 24px',
        position: 'relative',
        overflow: 'hidden',
    }    

    const cardStyle: React.CSSProperties = {
        width: '100%',
        maxWidth: '520px',
        position: 'relative',
        zIndex: 1,
    }
    
    const labelStyle: React.CSSProperties = {
        display: 'block',
        color: 'var(--text-muted)',
        fontSize: '11px',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        marginBottom: '8px',
        marginTop: '24px',
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '12px',
        color: 'var(--text)',
        fontSize: '15px',
        outline: 'none',
        boxSizing: 'border-box',
    }

    const btnStyle: React.CSSProperties = {
        width: '100%',
        backgroundColor: 'var(--accent-sec)',
        color: 'var(--btn-text)',
        border: 'none',
        borderRadius: 'var(--radius)',
        padding: '14px',
        fontWeight: 'bold',
        fontSize: '15px',
        cursor: 'pointer',
        marginTop: '32px',
    }

    // ── STEP 1 ─────────────────────────────────────────────────────────────────
    if (step === 1) {
        return (
            <div style={pageStyle}>
                <SnakeWatermark />
                <div style={cardStyle}>

                    {/* ── Back ── */}
                    <button
                        onClick={() => navigate('/onboarding')}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '15px', cursor: 'pointer', padding: 0, marginBottom: '32px' }}
                    >
                        ← Back
                    </button>

                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '1.5px', marginBottom: '8px' }}>STEP 1 OF 2</p>
                    <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '32px' }}>Set Up Your League</h1>

                    {/* ── League Name ── */}
                    <label style={labelStyle}>LEAGUE NAME</label>
                    <input
                        style={inputStyle}
                        value={leagueName}
                        onChange={e => setLeagueName(e.target.value)}
                        placeholder="e.g. Monday Night Ballers"
                    />

                    {/* ── Team Name ── */}
                    <label style={labelStyle}>YOUR TEAM NAME</label>
                    <input
                        style={inputStyle}
                        value={teamName}
                        onChange={e => setTeamName(e.target.value)}
                        placeholder="e.g. Rushing Roulette"
                    />

                    {/* ── Max Teams ── */}
                    <label style={labelStyle}>LEAGUE SIZE</label>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {MAX_TEAMS_OPTIONS.map(n => (
                            <button
                                key={n}
                                onClick={() => setMaxTeams(n)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '20px',
                                    border: '1px solid',
                                    borderColor: maxTeams === n ? 'var(--accent)' : 'var(--border)',
                                    backgroundColor: maxTeams === n ? 'var(--accent)' : 'var(--bg-card)',
                                    color: maxTeams === n ? '#000' : 'var(--text-muted)',
                                    fontWeight: 'bold',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                }}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '6px' }}>teams</p>

                    {/* ── Scoring ── */}
                    <label style={labelStyle}>SCORING FORMAT</label>
                    {SCORING_OPTIONS.map(opt => (
                        <div
                            key={opt.key}
                            onClick={() => setScoringType(opt.key)}
                            style={{
                                border: '1px solid',
                                borderColor: scoringType === opt.key ? 'var(--accent)' : 'var(--border)',
                                backgroundColor: scoringType === opt.key ? 'var(--bg-card)' : 'var(--bg)',
                                borderRadius: 'var(--radius)',
                                padding: '16px',
                                marginBottom: '10px',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                <span style={{
                                    fontWeight: 'bold',
                                    fontSize: '15px',
                                    color: scoringType === opt.key ? 'var(--accent)' : 'var(--text)',
                                }}>
                                    {opt.label}
                                </span>
                                <span style={{
                                    fontSize: '11px',
                                    border: '1px solid var(--border)',
                                    borderRadius: '10px',
                                    padding: '3px 8px',
                                    color: 'var(--text-muted)',
                                }}>
                                    {opt.tag}
                                </span>
                            </div>
                            <p style={{ color: 'var(--text-dim)', fontSize: '12px', lineHeight: '1.6', margin: 0 }}>{opt.desc}</p>
                        </div>
                    ))}

                    {/* ── Next ── */}
                    <button
                        style={{ ...btnStyle, opacity: (!leagueName.trim() || !teamName.trim()) ? 0.5 : 1 }}
                        onClick={() => {
                            if (!leagueName.trim() || !teamName.trim()) return
                            setStep(2)
                        }}
                    >
                        Next →
                    </button>

                </div>
            </div>
        )
    }

    // ── STEP 2 ─────────────────────────────────────────────────────────────────
    if (step === 2) {
        const selected = SCORING_OPTIONS.find(o => o.key === scoringType)!
        return (
            <div style={pageStyle}>
                <SnakeWatermark />
                <div style={cardStyle}>

                    {/* ── Back ── */}
                    <button
                        onClick={() => setStep(1)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '15px', cursor: 'pointer', padding: 0, marginBottom: '32px' }}
                    >
                        ← Back
                    </button>

                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '1.5px', marginBottom: '8px' }}>STEP 2 OF 2</p>
                    <h1 style={{ fontSize: '26px', fontWeight: 'bold', marginBottom: '32px' }}>Confirm & Create</h1>

                    {/* ── Summary ── */}
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        overflow: 'hidden',
                        marginBottom: '24px',
                    }}>
                        {[
                            { label: 'League', value: leagueName },
                            { label: 'Your Team', value: teamName },
                            { label: 'Size', value: `${maxTeams} teams` },
                            { label: 'Format', value: `${selected.label} · ${selected.tag}` },
                        ].map((row, i) => (
                            <div
                                key={row.label}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '14px 16px',
                                    borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)',
                                }}
                            >
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{row.label}</span>
                                <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{row.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* ── What Happens Next ── */}
                    <div style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius)',
                        padding: '16px',
                        marginBottom: '8px',
                    }}>
                        <p style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '1.5px', fontWeight: 'bold', marginBottom: '14px' }}>
                            WHAT HAPPENS NEXT
                        </p>
                        {[
                            "You'll get an invite code to share with your league mates",
                            "Each member joins and sets their team name",
                            "Head to League settings to choose your AI bot persona",
                            "When everyone is in, start the snake draft",
                            "Set your lineup each week and place side bets",
                        ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
                                <span style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '13px', minWidth: '16px' }}>{i + 1}</span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.5' }}>{item}</span>
                            </div>
                        ))}
                    </div>

                    {error && <p style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '12px' }}>{error}</p>}

                    {/* ── Create Button ── */}
                    <button
                        style={{ ...btnStyle, opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                        onClick={handleCreate}
                        disabled={loading}
                    >
                        {loading ? 'Creating...' : 'Create League'}
                    </button>

                </div>
            </div>
        )
    }

    // ── STEP 3: Invite Code ────────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <SnakeWatermark />
            <div style={{ width: '100%', maxWidth: '420px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        

                <h1 style={{ color: 'var(--accent)', fontSize: '26px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '6px' }}>
                    League Created
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '14px', marginBottom: '40px' }}>{leagueName}</p>

                {/* ── Invite Code Box ── */}
                <div style={{
                    border: '2px solid var(--accent)',
                    borderRadius: 'var(--radius)',
                    padding: '32px',
                    marginBottom: '16px',
                }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '11px', letterSpacing: '1.5px', marginBottom: '12px' }}>INVITE CODE</p>
                    <p style={{ color: 'var(--accent)', fontSize: '40px', fontWeight: 'bold', letterSpacing: '8px', margin: 0 }}>
                        {inviteCode}
                    </p>
                </div>

                <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6', marginBottom: '24px' }}>
                    Share this code with your league mates so they can join.
                </p>

                {/* ── Copy Button ── */}
                <button
                    onClick={handleCopy}
                    style={{ ...btnStyle, marginTop: '0' }}
                >
                    Copy Invite Code
                </button>

                {/* ── Go to Dashboard ── */}
                <button
                    onClick={() => navigate('/dashboard')}
                    style={{
                        width: '100%',
                        backgroundColor: 'transparent',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '14px',
                        fontWeight: 'bold',
                        fontSize: '15px',
                        cursor: 'pointer',
                        marginTop: '12px',
                    }}
                >
                    Go to My League
                </button>

            </div>
        </div>
    )
}
