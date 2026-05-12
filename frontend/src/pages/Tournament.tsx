import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const  API_URL = import.meta.env.VITE_API_URL


interface Tournament {
    id: string
    name: string
    theme: string | null
    entry_fee: number
    status: string
    ai_brain: string
    scoring_rules: { description: string; bonuses: { name: string; points: number }[] } | null
}

interface TournamentMatchup {
    id: string
    round: number
    home_user_id: string
    away_user_id: string | null
    home_points: number
    away_points: number
    winner_user_id: string | null
    commentary: string | null
}

export default function Tournament() {
    const { leagueId } = useParams<{ leagueId: string }>()
    const { session, user } = useAuth()
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [selectedTourney, setSelectedTourney] = useState<Tournament | null>(null)
    const [matchups, setMatchups] = useState<TournamentMatchup[]>([])
    const [loading, setLoading] = useState(true)
    const [prediction, setPrediction] = useState<{ [matchupId: string]: string }>({})
    const [customPrompt, setCustomPrompt] = useState('')

    //  Create Form
    const [showCreate, setShowCreate] = useState(false)
    const [name, setName] = useState('')
    const [theme, setTheme] = useState('')
    const [generating, setGenerating] = useState(false)

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}`}),
        [session?.access_token]
    )

    const fetchTournaments = async () => {
        const res = await axios.get(`${API_URL}/leagues/${leagueId}/tournaments`, { headers })
        setTournaments(res.data)
        setLoading(false)
    }

    const fetchMatchups = async (tourneyId: string) => {
        const res = await axios.get(`${API_URL}/leagues/tournaments/${tourneyId}/matchups`, { headers })
        setMatchups(res.data)
    }

    useEffect(() => { fetchTournaments() }, [])

    const handleCreate = async () => {
        const res = await axios.post(`${API_URL}/leagues/${leagueId}/tournaments`, { name, theme}, { headers })
        setShowCreate(false)
        fetchTournaments()
        setSelectedTourney(res.data)
    }

    const handleJoin = async (tourneyId: string) => {
        await axios.post(`${API_URL}/leagues/tournaments/${tourneyId}/join`, {}, { headers })
        fetchTournaments()
    }

    const handleVote = async (tourneyId: string, vote: string) => {
        await axios.post(`${API_URL}/leagues/tournaments/${tourneyId}/vote`, { vote }, { headers })
        fetchTournaments()
    }

    const handleGenerate = async (tourneyId: string) => {
        setGenerating(true)
        const res = await axios.post(`${API_URL}/leagues/tournaments/${tourneyId}/generate`, {}, { headers })
        setGenerating(false)
        fetchTournaments()
        if (selectedTourney) fetchMatchups(tourneyId)
    }

    const handleCommentary = async (tourneyId: string, matchupId: string) => {
        await axios.post(
            `${API_URL}/leagues/tournaments/${tourneyId}/matchups/${matchupId}/commentary`,
            { prompt: customPrompt },
            { headers }
        )
        fetchMatchups(tourneyId)
    }

    const handlePredict = async (tourneyId: string, matchupId: string) => {
        const res = await axios.get(
            `${API_URL}/leagues/tournaments/${tourneyId}/matchups/${matchupId}/predict`,
            { headers }
        )
        setPrediction(prev => ({ ...prev, [matchupId]: res.data.prediction }))
    }

    const label = (userId: string | null) => {
        if (!userId) return 'BYE'
        return userId === user?.id ? 'You' : userId.slice(0, 8)
    }

    if (loading) return <p>Loading tournaments...</p>

    return (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ marginBottom: '4px' }}>AI Tournaments</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>Create bracket tournaments with AI-generated scoring rules</p>
    
            <button onClick={() => setShowCreate(!showCreate)} style={{
                backgroundColor: 'var(--accent)', color: '#000', border: 'none',
                borderRadius: 'var(--radius)', padding: '10px 20px',
                cursor: 'pointer', fontWeight: 'bold', marginBottom: '16px'
            }}>+ New Tournament</button>
    
            {showCreate && (
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '16px' }}>
                    <h3 style={{ color: 'var(--accent)', marginBottom: '16px' }}>Create Tournament</h3>
                    {[
                        { lbl: 'Name', val: name, set: setName, ph: 'e.g. Summer Invitational' },
                        { lbl: 'Theme', val: theme, set: setTheme, ph: 'e.g. FIFA World Cup 2026' },
                    ].map(({ lbl, val, set, ph }) => (
                        <div key={lbl} style={{ marginBottom: '12px' }}>
                            <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>{lbl}</label>
                            <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px' }} />
                        </div>
                    ))}
                    <button onClick={handleCreate} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>Create</button>
                </div>
            )}
    
            {tournaments.length === 0 ? (
                <p style={{ color: 'var(--text-dim)' }}>No tournaments yet.</p>
            ) : tournaments.map(t => (
                <div key={t.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                            <div style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '16px' }}>{t.name}</div>
                            {t.theme && <div style={{ color: 'var(--text-dim)', fontSize: '13px', marginTop: '2px' }}>{t.theme}</div>}
                        </div>
                        <span style={{ color: t.status === 'active' ? 'var(--accent)' : 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>{t.status}</span>
                    </div>
    
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '12px' }}>AI Brain: {t.ai_brain}</p>
    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                        {[
                            { label: 'Join', action: () => handleJoin(t.id) },
                            { label: 'Vote: Claude', action: () => handleVote(t.id, 'claude') },
                            { label: 'Vote: GPT-4', action: () => handleVote(t.id, 'gpt4') },
                        ].map(({ label, action }) => (
                            <button key={label} onClick={action} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>{label}</button>
                        ))}
                        {t.status === 'setup' && (
                            <button onClick={() => handleGenerate(t.id)} disabled={generating} style={{ backgroundColor: generating ? 'var(--border)' : 'var(--accent)', color: generating ? 'var(--text-dim)' : '#000', border: 'none', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: generating ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                {generating ? 'Generating...' : 'Generate Bracket'}
                            </button>
                        )}
                        <button onClick={() => { setSelectedTourney(t); fetchMatchups(t.id) }} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>View Bracket</button>
                    </div>
    
                    {t.scoring_rules && (
                        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: 'var(--bg-deep)', borderRadius: 'var(--radius)' }}>
                            <div style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '8px' }}>Scoring Rules</div>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>{t.scoring_rules.description}</p>
                            {t.scoring_rules.bonuses.map((b, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: '1px solid var(--border-subtle)', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>{b.name}</span>
                                    <span style={{ color: b.points >= 0 ? 'var(--accent)' : 'var(--danger)' }}>{b.points > 0 ? '+' : ''}{b.points} pts</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
    
            {selectedTourney && (
                <div style={{ marginTop: '24px' }}>
                    <h2 style={{ marginBottom: '16px' }}>Bracket — {selectedTourney.name}</h2>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Custom Commentary Prompt</label>
                        <input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="e.g. they have a heated rivalry"
                            style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px' }} />
                    </div>
                    {matchups.map(m => (
                        <div key={m.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ textAlign: 'center' as const, flex: 1 }}>
                                    <div style={{ color: m.home_user_id === user?.id ? 'var(--accent)' : 'var(--text)', fontWeight: m.winner_user_id === m.home_user_id ? 'bold' : 'normal' }}>{label(m.home_user_id)}</div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>{m.home_points}</div>
                                </div>
                                <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>VS</div>
                                <div style={{ textAlign: 'center' as const, flex: 1 }}>
                                    <div style={{ color: m.away_user_id === user?.id ? 'var(--accent)' : 'var(--text)', fontWeight: m.winner_user_id === m.away_user_id ? 'bold' : 'normal' }}>{label(m.away_user_id)}</div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>{m.away_points}</div>
                                </div>
                            </div>
                            {m.commentary && <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px', marginBottom: '12px' }}>"{m.commentary}"</p>}
                            {prediction[m.id] && <p style={{ color: 'var(--accent)', fontSize: '13px', marginBottom: '12px' }}><strong>Prediction:</strong> {prediction[m.id]}</p>}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleCommentary(selectedTourney.id, m.id)} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>Get Commentary</button>
                                <button onClick={() => handlePredict(selectedTourney.id, m.id)} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>Predict Winner</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )    

}
