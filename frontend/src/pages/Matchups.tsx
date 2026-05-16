import { useState, useEffect, useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
const CURRENT_WEEK = 1

interface Matchup {
    id: string
    home_user_id: string
    away_user_id: string
    home_points: number
    away_points: number
    winner_user_id: string | null
}

interface Standing {
    user_id: string
    wins: number
    losses: number
    points_for: number
}

interface PlayoffMatchup {
    id: string
    home_user_id: string
    away_user_id: string
    home_points: number
    away_points: number
    winner_user_id: string | null
    round: string
    week: number
}

const ROUND_LABELS: Record<string, string> = {
    wildcard: 'Wild Card — Week 15',
    semifinal: 'Semifinals — Week 16',
    championship: 'Championship — Week 17',
    third_place: '3rd Place — Week 17',
}

const card: CSSProperties = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
    marginBottom: '16px',
}

const tab_style = (active: boolean): CSSProperties => ({
    padding: '8px 20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 'bold' : 'normal',
    color: active ? 'var(--accent)' : 'var(--text-dim)',
    borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
    letterSpacing: '0.5px',
})

export default function Matchups() {
    const { leagueId } = useParams<{ leagueId: string }>()
    const { session, user } = useAuth()
    const { getTeamName, activeLeague } = useLeague()

    const [tab, setTab] = useState<'season' | 'playoffs'>('season')
    const [week, setWeek] = useState(CURRENT_WEEK)
    const [matchups, setMatchups] = useState<Matchup[]>([])
    const [standings, setStandings] = useState<Standing[]>([])
    const [playoffs, setPlayoffs] = useState<PlayoffMatchup[]>([])
    const [loading, setLoading] = useState(true)
    const [playoffsLoading, setPlayoffsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [playoffTeams, setPlayoffTeams] = useState(6)
    const [tiebreaker, setTiebreaker] = useState('points')
    const [advanceWeek, setAdvanceWeek] = useState(15)
    const [scoreWeek, setScoreWeek] = useState(15)

    const isCommissioner = activeLeague?.commissioner_id === user?.id

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}` }),
        [session?.access_token]
    )

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [matchupsRes, standingsRes] = await Promise.all([
                    axios.get(`${API_URL}/leagues/${leagueId}/matchups?week=${week}`, { headers }),
                    axios.get(`${API_URL}/leagues/${leagueId}/standings`, { headers }),
                ])
                setMatchups(matchupsRes.data)
                setStandings(standingsRes.data)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [week, leagueId, headers])

    useEffect(() => {
        if (tab !== 'playoffs') return
        setPlayoffsLoading(true)
        axios.get(`${API_URL}/leagues/${leagueId}/playoffs`, { headers })
            .then(res => setPlayoffs(res.data))
            .catch(() => {})
            .finally(() => setPlayoffsLoading(false))
    }, [tab, leagueId, headers])

    const act = async (fn: () => Promise<any>) => {
        setError('')
        setSuccess('')
        try {
            await fn()
            setSuccess('Done!')
        } catch (e: any) {
            setError(e.response?.data?.detail || 'Action failed')
        }
    }


    if (loading) return <p>Loading matchups...</p>

    return (
        <div style={{ maxWidth: '800px' }}>
            <h1 style={{ marginBottom: '4px' }}>Matchups</h1>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
                <div style={tab_style(tab === 'season')} onClick={() => setTab('season')}>Season</div>
                <div style={tab_style(tab === 'playoffs')} onClick={() => setTab('playoffs')}>Playoffs</div>
            </div>

            {tab === 'season' && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                        <button onClick={() => setWeek(w => Math.max(1, w - 1))} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '20px', cursor: 'pointer' }}>‹</button>
                        <span style={{ color: 'var(--text-dim)' }}>Week {week}</span>
                        <button onClick={() => setWeek(w => w + 1)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '20px', cursor: 'pointer' }}>›</button>
                    </div>

                    {matchups.length === 0 ? (
                        <p style={{ color: 'var(--text-dim)' }}>No matchups for week {week}.</p>
                    ) : matchups.map(m => {
                        const isMyMatchup = m.home_user_id === user?.id || m.away_user_id === user?.id
                        return (
                            <div key={m.id} style={{ ...card, border: `1px solid ${isMyMatchup ? 'var(--accent)' : 'var(--border)'}` }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <div style={{ color: m.home_user_id === user?.id ? 'var(--accent)' : 'var(--text)', fontWeight: 'bold', fontSize: '16px' }}>
                                            {getTeamName(m.home_user_id)}
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: m.winner_user_id === m.home_user_id ? 'var(--accent)' : 'var(--text)', marginTop: '4px' }}>
                                            {m.home_points.toFixed(1)}
                                        </div>
                                    </div>
                                    <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '0 16px' }}>VS</div>
                                    <div style={{ textAlign: 'center', flex: 1 }}>
                                        <div style={{ color: m.away_user_id === user?.id ? 'var(--accent)' : 'var(--text)', fontWeight: 'bold', fontSize: '16px' }}>
                                            {getTeamName(m.away_user_id)}
                                        </div>
                                        <div style={{ fontSize: '28px', fontWeight: 'bold', color: m.winner_user_id === m.away_user_id ? 'var(--accent)' : 'var(--text)', marginTop: '4px' }}>
                                            {m.away_points.toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                                {m.winner_user_id && (
                                    <div style={{ textAlign: 'center', marginTop: '12px', color: 'var(--accent)', fontSize: '12px', letterSpacing: '1px' }}>
                                        WINNER: {getTeamName(m.winner_user_id)}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    <h2 style={{ marginBottom: '12px', marginTop: '24px' }}>Standings</h2>
                    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', textAlign: 'left', fontWeight: 'normal', letterSpacing: '1px', fontSize: '11px', textTransform: 'uppercase' as const }}>Team</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', textAlign: 'center', fontWeight: 'normal', letterSpacing: '1px', fontSize: '11px', textTransform: 'uppercase' as const }}>W</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', textAlign: 'center', fontWeight: 'normal', letterSpacing: '1px', fontSize: '11px', textTransform: 'uppercase' as const }}>L</th>
                                    <th style={{ padding: '12px 16px', color: 'var(--text-dim)', textAlign: 'center', fontWeight: 'normal', letterSpacing: '1px', fontSize: '11px', textTransform: 'uppercase' as const }}>PF</th>
                                </tr>
                            </thead>
                            <tbody>
                                {standings.map((s, i) => (
                                    <tr key={s.user_id} style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: s.user_id === user?.id ? 'var(--accent-dark)' : 'transparent' }}>
                                        <td style={{ padding: '12px 16px', color: s.user_id === user?.id ? 'var(--accent)' : 'var(--text)' }}>
                                            {i + 1}. {getTeamName(s.user_id)}
                                        </td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text)', textAlign: 'center' }}>{s.wins}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>{s.losses}</td>
                                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>{s.points_for}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {tab === 'playoffs' && (
                <>
                    {error && <p style={{ color: 'var(--danger)', marginBottom: '12px' }}>{error}</p>}
                    {success && <p style={{ color: 'var(--accent)', marginBottom: '12px' }}>{success}</p>}

                    {playoffsLoading ? <p>Loading playoffs...</p> : playoffs.length === 0 ? (
                        <div style={card}>
                            <p style={{ color: 'var(--text-dim)' }}>No playoff bracket yet.{isCommissioner ? ' Generate it below.' : ' Check back after the regular season.'}</p>
                        </div>
                    ) : (
                        ['wildcard', 'semifinal', 'championship', 'third_place'].map(round => {
                            const roundMatchups = playoffs.filter(m => m.round === round)
                            if (roundMatchups.length === 0) return null
                            return (
                                <div key={round} style={card}>
                                    <div style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '12px' }}>
                                        {ROUND_LABELS[round]}
                                    </div>
                                    {roundMatchups.map(m => (
                                        <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                    <span style={{ color: m.winner_user_id === m.home_user_id ? 'var(--accent)' : m.winner_user_id ? 'var(--text-dim)' : 'var(--text)', fontWeight: m.winner_user_id === m.home_user_id ? 'bold' : 'normal' }}>
                                                        {getTeamName(m.home_user_id)}
                                                    </span>
                                                    <span style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '18px' }}>{m.home_points.toFixed(1)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span style={{ color: m.winner_user_id === m.away_user_id ? 'var(--accent)' : m.winner_user_id ? 'var(--text-dim)' : 'var(--text)', fontWeight: m.winner_user_id === m.away_user_id ? 'bold' : 'normal' }}>
                                                        {getTeamName(m.away_user_id)}
                                                    </span>
                                                    <span style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '18px' }}>{m.away_points.toFixed(1)}</span>
                                                </div>
                                            </div>
                                            {m.winner_user_id && <span style={{ marginLeft: '16px', color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px' }}>FINAL</span>}
                                        </div>
                                    ))}
                                </div>
                            )
                        })
                    )}

                    {isCommissioner && (
                        <div style={card}>
                            <div style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const, marginBottom: '16px' }}>Commissioner Controls</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>Settings</p>
                                    <label style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Playoff Teams</label>
                                    <select value={playoffTeams} onChange={e => setPlayoffTeams(Number(e.target.value))} style={{ display: 'block', width: '100%', backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px', marginBottom: '10px', marginTop: '4px' }}>
                                        <option value={4}>4 Teams</option>
                                        <option value={6}>6 Teams</option>
                                        <option value={8}>8 Teams</option>
                                    </select>
                                    <label style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Tiebreaker</label>
                                    <select value={tiebreaker} onChange={e => setTiebreaker(e.target.value)} style={{ display: 'block', width: '100%', backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px', marginBottom: '12px', marginTop: '4px' }}>
                                        <option value="points">Total Points</option>
                                        <option value="money_won">Most Money Won</option>
                                        <option value="head_to_head">Head to Head</option>
                                    </select>
                                    <button onClick={() => act(() => axios.patch(`${API_URL}/leagues/${leagueId}/playoffs/settings`, { playoff_teams: playoffTeams, tiebreaker }, { headers }))} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                                        Save Settings
                                    </button>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>Bracket Actions</p>
                                    <button onClick={() => act(() => axios.post(`${API_URL}/leagues/${leagueId}/playoffs/bracket`, {}, { headers }))} style={{ display: 'block', width: '100%', backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', marginBottom: '10px' }}>
                                        Generate Bracket
                                    </button>
                                    <label style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Score Week</label>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px', marginBottom: '10px' }}>
                                        <select value={scoreWeek} onChange={e => setScoreWeek(Number(e.target.value))} style={{ flex: 1, backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px' }}>
                                            <option value={15}>Week 15</option>
                                            <option value={16}>Week 16</option>
                                            <option value={17}>Week 17</option>
                                        </select>
                                        <button onClick={() => act(() => axios.post(`${API_URL}/leagues/${leagueId}/playoffs/score`, { week: scoreWeek }, { headers }))} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Score</button>
                                    </div>
                                    <label style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Advance After Week</label>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                        <select value={advanceWeek} onChange={e => setAdvanceWeek(Number(e.target.value))} style={{ flex: 1, backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px' }}>
                                            <option value={15}>Week 15</option>
                                            <option value={16}>Week 16</option>
                                        </select>
                                        <button onClick={() => act(() => axios.post(`${API_URL}/leagues/${leagueId}/playoffs/advance`, { completed_week: advanceWeek }, { headers }))} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>Advance</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
