import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

interface Award {
    id: string
    award_name: string
    user_id: string
    team_name: string
}

interface Season {
    season: number
    champion: { user_id: string, team_name: string } | null
    high_scorer: { user_id: string, team_name: string, points: number } | null
    awards: Award[]
}

export default function LeagueHistory() {
    const { leagueId } = useParams<{ leagueId: string }>()
    const { session, user } = useAuth()
    const { activeLeague, members } = useLeague()
    const [history, setHistory] = useState<Season[]>([])
    const [loading, setLoading] = useState(true)
    const [newAwardName, setNewAwardName] = useState('')
    const [newAwardUser, setNewAwardUser] = useState('')
    const [newAwardSeason, setNewAwardSeason] = useState(2024)
    const [saving, setSaving] = useState(false)

    const isCommissioner = activeLeague?.commissioner_id === user?.id

    const headers = useMemo(() => ({
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
    }), [session?.access_token])

    const fetchHistory = () => {
        if (!session) return
        axios.get(`${API_URL}/leagues/${leagueId}/history`, { headers })
            .then(res => { setHistory(res.data); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { fetchHistory() }, [session])

    const handleAddAward = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newAwardName || !newAwardUser) return
        setSaving(true)
        try {
            await axios.post(`${API_URL}/leagues/${leagueId}/history/awards`, {
                season: newAwardSeason,
                award_name: newAwardName,
                user_id: newAwardUser,
            }, { headers })
            setNewAwardName('')
            setNewAwardUser('')
            fetchHistory()
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteAward = async (awardId: string) => {
        await axios.delete(`${API_URL}/leagues/${leagueId}/history/awards/${awardId}`, { headers })
        fetchHistory()
    }

    const card: React.CSSProperties = {
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px',
        marginBottom: '16px',
    }

    if (loading) return <p>Loading history...</p>

    return (
        <div style={{ maxWidth: '700px' }}>
            <h1 style={{ marginBottom: '4px' }}>League History</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>Past seasons, champions, and awards</p>

            {history.length === 0 && (
                <div style={card}>
                    <p style={{ color: 'var(--text-dim)' }}>No history yet. Check back after the season ends.</p>
                </div>
            )}

            {history.map(season => (
                <div key={season.season} style={card}>
                    <div style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>
                        {season.season} Season
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>🏆 Champion</div>
                            <div style={{ color: 'var(--text)', fontWeight: 'bold' }}>{season.champion?.team_name || '—'}</div>
                        </div>
                        <div>
                            <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>⚡ High Scorer</div>
                            <div style={{ color: 'var(--text)', fontWeight: 'bold' }}>{season.high_scorer?.team_name || '—'}</div>
                            {season.high_scorer && <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{season.high_scorer.points.toFixed(1)} pts</div>}
                        </div>
                    </div>

                    {season.awards.length > 0 && (
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                            <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Awards</div>
                            {season.awards.map(a => (
                                <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                    <span style={{ color: 'var(--text)', fontSize: '14px' }}>
                                        {a.award_name} — <span style={{ color: 'var(--accent)' }}>{a.team_name}</span>
                                    </span>
                                    {isCommissioner && (
                                        <button onClick={() => handleDeleteAward(a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {isCommissioner && (
                <div style={card}>
                    <div style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Add Award</div>
                    <form onSubmit={handleAddAward}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <div>
                                <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Season</label>
                                <input type="number" value={newAwardSeason} onChange={e => setNewAwardSeason(Number(e.target.value))} style={{ display: 'block', width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', color: 'var(--text)', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Award Name</label>
                                <input value={newAwardName} onChange={e => setNewAwardName(e.target.value)} placeholder="e.g. MVP" style={{ display: 'block', width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', color: 'var(--text)', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }} />
                            </div>
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>Recipient</label>
                            <select value={newAwardUser} onChange={e => setNewAwardUser(e.target.value)} style={{ display: 'block', width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', color: 'var(--text)', fontSize: '14px', marginTop: '4px' }}>
                                <option value="">— Select member —</option>
                                {members.map(m => <option key={m.user_id} value={m.user_id}>{m.team_name}</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={saving} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer' }}>
                            {saving ? 'Adding...' : 'Add Award'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    )
}
