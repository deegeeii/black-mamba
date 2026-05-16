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
    draft_budget: number | null
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

interface Entity {
    id: string
    name: string
    entity_type: string
    price: number
    stats: Record<string, any>
    picked_by: string | null
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
    const [entities, setEntities] = useState<Entity[]>([])
    const [generatingDraft, setGeneratingDraft] = useState(false)
    const [picking, setPicking] = useState<string | null>(null)
    const [tab, setTab] = useState<'h2h' | 'myteam' | 'standings' | 'draft'>('h2h')


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
        try {
            const res = await axios.get(`${API_URL}/leagues/${leagueId}/tournaments`, { headers })
            setTournaments(res.data)
        } catch {} finally {
            setLoading(false)
        }
    }

    const fetchMatchups = async (tourneyId: string) => {
        try {
            const res = await axios.get(`${API_URL}/leagues/tournaments/${tourneyId}/matchups`, { headers })
            setMatchups(res.data)
        } catch {}
    }

    useEffect(() => { fetchTournaments() }, [leagueId, headers])

    const handleCreate = async () => {
        try {
            const res = await axios.post(`${API_URL}/leagues/${leagueId}/tournaments`, { name, theme }, { headers })
            setShowCreate(false)
            fetchTournaments()
            setSelectedTourney(res.data)
            fetchEntities(res.data.id)
        } catch {}
    }

    const handleJoin = async (tourneyId: string) => {
        try {
            await axios.post(`${API_URL}/leagues/tournaments/${tourneyId}/join`, {}, { headers })
            fetchTournaments()
        } catch {}
    }

    const handleVote = async (tourneyId: string, vote: string) => {
        try {
            await axios.post(`${API_URL}/leagues/tournaments/${tourneyId}/vote`, { vote }, { headers })
            fetchTournaments()
        } catch {}
    }

    const handleGenerate = async (tourneyId: string) => {
        setGenerating(true)
        try {
            await axios.post(`${API_URL}/leagues/tournaments/${tourneyId}/generate`, {}, { headers })
            fetchTournaments()
            if (selectedTourney) fetchMatchups(tourneyId)
        } catch {} finally {
            setGenerating(false)
        }
    }

    const handleCommentary = async (tourneyId: string, matchupId: string) => {
        try {
            await axios.post(
                `${API_URL}/leagues/tournaments/${tourneyId}/matchups/${matchupId}/commentary`,
                { prompt: customPrompt },
                { headers }
            )
            fetchMatchups(tourneyId)
        } catch {}
    }

    const handlePredict = async (tourneyId: string, matchupId: string) => {
        try {
            const res = await axios.get(
                `${API_URL}/leagues/tournaments/${tourneyId}/matchups/${matchupId}/predict`,
                { headers }
            )
            setPrediction(prev => ({ ...prev, [matchupId]: res.data.prediction }))
        } catch {}
    }

    const label = (userId: string | null) => {
        if (!userId) return 'BYE'
        return userId === user?.id ? 'You' : userId.slice(0, 8)
    }

    const fetchEntities = async (tourneyId: string) => {
        try {
            const res = await axios.get(`${API_URL}/leagues/tournaments/${tourneyId}/draft/entities`, { headers })
            setEntities(res.data)
        } catch {}
    }

    const handleGenerateDraft = async (tourneyId: string) => {
        setGeneratingDraft(true)
        try {
            await axios.post(`${API_URL}/leagues/tournaments/${tourneyId}/draft/generate`, {}, { headers })
            fetchEntities(tourneyId)
            fetchTournaments()
        } catch {} finally {
            setGeneratingDraft(false)
        }
    }
    
    const handlePick = async (tourneyId: string, entityId: string) => {
        setPicking(entityId)
        try {
            await axios.post(`${API_URL}/leagues/tournaments/${tourneyId}/draft/pick/${entityId}`, {}, { headers })
            fetchEntities(tourneyId)
        } catch (e: any) {
            alert(e.response?.data?.detail || 'Pick failed')
        }
        setPicking(null)
    }

    const handleCloseDraft = async (tourneyId: string) => {
        try {
            await axios.post(`${API_URL}/leagues/tournaments/${tourneyId}/draft/close`, {}, { headers })
            fetchTournaments()
            fetchEntities(tourneyId)
        } catch {}
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
                        <button onClick={() => { setSelectedTourney(t); fetchMatchups(t.id); fetchEntities(t.id); setTab('h2h') }} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: 'pointer', fontSize: '13px' }}>View Bracket</button>

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
            <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ margin: 0 }}>{selectedTourney.name}</h2>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' }}>{selectedTourney.status}</span>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
                    {(['h2h', 'myteam', 'standings', 'draft'] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)} style={{
                            backgroundColor: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                            color: tab === t ? 'var(--accent)' : 'var(--text-dim)', padding: '10px 16px',
                            cursor: 'pointer', fontWeight: tab === t ? 'bold' : 'normal', fontSize: '13px', marginBottom: '-1px'
                        }}>
                            {t === 'h2h' ? 'Head to Head' : t === 'myteam' ? 'My Team' : t === 'standings' ? 'Standings' : 'Draft Room'}
                        </button>
                    ))}
                </div>

                {tab === 'h2h' && (
                    <>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Custom Commentary Prompt</label>
                            <input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="e.g. they have a heated rivalry"
                                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px' }} />
                        </div>
                        {matchups.length === 0
                            ? <p style={{ color: 'var(--text-dim)' }}>Bracket not generated yet.</p>
                            : matchups.map(m => (
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
                            ))
                        }
                    </>
                )}

                {tab === 'myteam' && (() => {
                    const myPicks = entities.filter(e => e.picked_by === user?.id)
                    return myPicks.length === 0
                        ? <p style={{ color: 'var(--text-dim)' }}>You haven't picked anyone yet.</p>
                        : myPicks.map(e => (
                            <div key={e.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--accent)', borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ color: 'var(--text)', fontWeight: 'bold' }}>{e.name}</div>
                                    <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '2px', textTransform: 'capitalize' }}>{e.entity_type}</div>
                                </div>
                                <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '15px' }}>${e.price.toLocaleString()}</div>
                            </div>
                        ))
                })()}

                {tab === 'standings' && (() => {
                    const map: Record<string, { wins: number; points: number }> = {}
                    matchups.forEach(m => {
                        if (!map[m.home_user_id]) map[m.home_user_id] = { wins: 0, points: 0 }
                        if (m.away_user_id && !map[m.away_user_id]) map[m.away_user_id] = { wins: 0, points: 0 }
                        map[m.home_user_id].points += m.home_points || 0
                        if (m.away_user_id) map[m.away_user_id].points += m.away_points || 0
                        if (m.winner_user_id && map[m.winner_user_id]) map[m.winner_user_id].wins += 1
                    })
                    const standings = Object.entries(map)
                        .map(([userId, stats]) => ({ userId, ...stats }))
                        .sort((a, b) => b.wins - a.wins || b.points - a.points)
                    return standings.length === 0
                        ? <p style={{ color: 'var(--text-dim)' }}>No standings yet.</p>
                        : standings.map((s, i) => (
                            <div key={s.userId} style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${s.userId === user?.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span style={{ color: 'var(--text-dim)', fontWeight: 'bold', fontSize: '16px', width: '24px' }}>{i + 1}</span>
                                <span style={{ color: s.userId === user?.id ? 'var(--accent)' : 'var(--text)', fontWeight: 'bold', flex: 1 }}>{s.userId === user?.id ? 'You' : s.userId.slice(0, 8)}</span>
                                <span style={{ color: 'var(--text)' }}>{s.wins}W</span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{s.points.toFixed(1)} pts</span>
                            </div>
                        ))
                })()}

                {tab === 'draft' && (() => {
                    const myPicks = entities.filter(e => e.picked_by === user?.id)
                    const spent = myPicks.reduce((s, e) => s + e.price, 0)
                    const budget = selectedTourney.draft_budget || 50000
                    const remaining = budget - spent
                    const isDrafting = selectedTourney.status === 'drafting'
                    return (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <span style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Draft Pool</span>
                                {isDrafting && entities.length === 0 && (
                                    <button onClick={() => handleGenerateDraft(selectedTourney.id)} disabled={generatingDraft} style={{ backgroundColor: generatingDraft ? 'var(--border)' : 'var(--accent)', color: generatingDraft ? 'var(--text-dim)' : '#000', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: generatingDraft ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                        {generatingDraft ? 'Generating...' : 'Generate Draft Pool'}
                                    </button>
                                )}
                                {isDrafting && entities.length > 0 && (
                                    <button onClick={() => handleCloseDraft(selectedTourney.id)} style={{ backgroundColor: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Close Draft</button>
                                )}
                            </div>
                            {entities.length > 0 && (
                                <>
                                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '32px' }}>
                                        <div><div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px' }}>BUDGET</div><div style={{ color: 'var(--text)', fontWeight: 'bold' }}>${budget.toLocaleString()}</div></div>
                                        <div><div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px' }}>SPENT</div><div style={{ color: 'var(--text)', fontWeight: 'bold' }}>${spent.toLocaleString()}</div></div>
                                        <div><div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px' }}>REMAINING</div><div style={{ color: remaining >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 'bold' }}>${remaining.toLocaleString()}</div></div>
                                        <div><div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px' }}>PICKS</div><div style={{ color: 'var(--text)', fontWeight: 'bold' }}>{myPicks.length}</div></div>
                                    </div>
                                    {entities.map(e => (
                                        <div key={e.id} style={{ backgroundColor: 'var(--bg-card)', border: `1px solid ${e.picked_by === user?.id ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '14px 16px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: e.picked_by && e.picked_by !== user?.id ? 0.5 : 1 }}>
                                            <div>
                                                <div style={{ color: 'var(--text)', fontWeight: 'bold' }}>{e.name}</div>
                                                <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '2px', textTransform: 'capitalize' }}>{e.entity_type}</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                <div style={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '15px' }}>${e.price.toLocaleString()}</div>
                                                {e.picked_by ? (
                                                    <span style={{ color: e.picked_by === user?.id ? 'var(--accent)' : 'var(--text-dim)', fontSize: '12px' }}>{e.picked_by === user?.id ? 'Your pick' : 'Taken'}</span>
                                                ) : isDrafting ? (
                                                    <button onClick={() => handlePick(selectedTourney.id, e.id)} disabled={picking === e.id} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: picking === e.id ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                                                        {picking === e.id ? '...' : 'Pick'}
                                                    </button>
                                                ) : (
                                                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Available</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </>
                    )
                })()}
            </div>
        )}

        </div>
    )    

}
