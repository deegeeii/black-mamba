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
        <div>
            <h1>AI Tournaments</h1>

            <button onClick={() => setShowCreate(!showCreate)}>+ New Tournament</button>

            {showCreate && (
                <div style={{ border: '1px solid #ccc', padding: '12px', margin: '8px 0' }}>
                    <h3>Create Tournament</h3>
                    <div><label>Name </label><input value={name} onChange={e => setName(e.target.value)} /></div>
                    <div><label>Theme </label><input value={theme} onChange={e => setTheme(e.target.value)} placeholder="e.g. FIFA World Cup 2026" /></div>
                    <button onClick={handleCreate}>Create</button>
                </div>
            )}

            <h2>Tournaments</h2>
            {tournaments.length === 0 ? <p>No tournaments yet.</p> : tournaments.map(t => (
                <div key={t.id} style={{ border: '1px solid #ccc', padding: '12px', margin: '8px 0' }}>
                    <h3>{t.name} {t.theme && `— ${t.theme}`}</h3>
                    <p>Status: {t.status} | AI Brain: {t.ai_brain}</p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={() => handleJoin(t.id)}>Join</button>
                        <button onClick={() => handleVote(t.id, 'claude')}>Vote: Claude</button>
                        <button onClick={() => handleVote(t.id, 'gpt4')}>Vote: GPT-4</button>
                        {t.status === 'setup' && (
                            <button onClick={() => handleGenerate(t.id)} disabled={generating}>
                                {generating ? 'Generating...' : 'Generate Bracket'}
                            </button>
                        )}
                        <button onClick={() => {
                            setSelectedTourney(t)
                            fetchMatchups(t.id)
                        }}>View Bracket</button>
                    </div>

                    {t.scoring_rules && (
                        <div style={{ marginTop: '8px' }}>
                            <strong>Scoring Rules:</strong>
                            <p>{t.scoring_rules.description}</p>
                            <ul>
                                {t.scoring_rules.bonuses.map((b, i) => (
                                    <li key={i}>{b.name}: {b.points > 0 ? '+' : ''}{b.points} pts</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ))}

            {selectedTourney && (
                <div>
                    <h2>Bracket — {selectedTourney.name}</h2>
                    <div style={{ margin: '8px 0' }}>
                        <label>Custom prompt for commentary: </label>
                        <input value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="e.g. they have a heated rivalry" />
                    </div>
                    {matchups.map(m => (
                        <div key={m.id} style={{ border: '1px solid #ccc', padding: '12px', margin: '8px 0' }}>
                            <p>
                                <span style={{ fontWeight: m.winner_user_id === m.home_user_id ? 'bold' : 'normal' }}>
                                    {label(m.home_user_id)} ({m.home_points} pts)
                                </span>
                                {' vs '}
                                <span style={{ fontWeight: m.winner_user_id === m.away_user_id ? 'bold' : 'normal' }}>
                                    {label(m.away_user_id)} ({m.away_points} pts)
                                </span>
                            </p>
                            {m.commentary && <p style={{ fontStyle: 'italic' }}>"{m.commentary}"</p>}
                            {prediction[m.id] && <p><strong>Prediction:</strong> {prediction[m.id]}</p>}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => handleCommentary(selectedTourney.id, m.id)}>Get Commentary</button>
                                <button onClick={() => handlePredict(selectedTourney.id, m.id)}>Predict Winner</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )

}
