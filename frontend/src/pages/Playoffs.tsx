// ── IMPORTS ────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL

// ── INTERFACES / TYPES ─────────────────────────────────────────────────────────
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

// ── STYLE CONSTANTS ────────────────────────────────────────────────────────────
const ROUND_LABELS: Record<string, string> = {
  wildcard: 'Wild Card — Week 15',
  semifinal: 'Semifinals — Week 16',
  championship: 'Championship — Week 17',
  third_place: '3rd Place — Week 17',
}

const card: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px',
  marginBottom: '16px',
}

const sectionTitle: React.CSSProperties = {
  color: 'var(--accent)',
  fontSize: '11px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  marginBottom: '12px',
}

export default function Playoffs() {
  // ── STATE ────────────────────────────────────────────────────────────────────
  const { session, user } = useAuth()
  const { activeLeague } = useLeague()

  const [matchups, setMatchups] = useState<PlayoffMatchup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isCommissioner, setIsCommissioner] = useState(false)
  const [playoffTeams, setPlayoffTeams] = useState(6)
  const [tiebreaker, setTiebreaker] = useState('points')
  const [advanceWeek, setAdvanceWeek] = useState(15)
  const [scoreWeek, setScoreWeek] = useState(15)

  // ── EFFECTS / FETCH ON MOUNT ──────────────────────────────────────────────────
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${session?.access_token}` }),
    [session?.access_token]
  )

  const fetchData = () => {
    if (!activeLeague || !session) return
    const id = activeLeague.id
    Promise.allSettled([
      axios.get(`${API_URL}/leagues/${id}/playoffs`, { headers }),
      axios.get(`${API_URL}/leagues/${id}/members`, { headers }),
    ]).then(([m, mem]) => {
      if (m.status === 'fulfilled') setMatchups(m.value.data)
      if (mem.status === 'fulfilled') {
        const me = mem.value.data.find((m: any) => m.user_id === user?.id)
        setIsCommissioner(me?.role === 'commissioner')
      }
      setLoading(false)
    })
  }

  useEffect(() => { fetchData() }, [activeLeague, session])

  // ── HANDLERS ─────────────────────────────────────────────────────────────────
  const act = async (fn: () => Promise<any>) => {
    setError('')
    setSuccess('')
    try {
      await fn()
      setSuccess('Done!')
      fetchData()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Action failed')
    }
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────────
  const label = (uid: string) => uid === user?.id ? 'You' : uid.slice(0, 8)

  const rounds = ['wildcard', 'semifinal', 'championship', 'third_place']

  if (!activeLeague) return <p style={{ color: 'var(--text-dim)' }}>Select a league from the sidebar.</p>
  if (loading) return <p>Loading playoffs...</p>

  // ── JSX ────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '900px', color: 'var(--text)' }}>
      <h1 style={{ marginBottom: '4px' }}>Playoffs</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>{activeLeague.name}</p>

      {error && <p style={{ color: 'var(--danger)', marginBottom: '12px' }}>{error}</p>}
      {success && <p style={{ color: 'var(--accent)', marginBottom: '12px' }}>{success}</p>}

      {/* ── Bracket ── */}
      {matchups.length === 0 ? (
        <div style={card}>
          <p style={{ color: 'var(--text-dim)' }}>No playoff bracket yet.{isCommissioner ? ' Generate it below.' : ' Check back after the regular season.'}</p>
        </div>
      ) : (
        rounds.map(round => {
          const roundMatchups = matchups.filter(m => m.round === round)
          if (roundMatchups.length === 0) return null
          return (
            <div key={round} style={card}>
              <div style={sectionTitle}>{ROUND_LABELS[round]}</div>
              {/* ── Matchup Rows ── */}
              {roundMatchups.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ color: m.winner_user_id === m.home_user_id ? 'var(--accent)' : m.winner_user_id ? 'var(--text-dim)' : 'var(--text)', fontWeight: m.winner_user_id === m.home_user_id ? 'bold' : 'normal' }}>
                        {label(m.home_user_id)}
                      </span>
                      <span style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '18px' }}>{m.home_points.toFixed(1)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: m.winner_user_id === m.away_user_id ? 'var(--accent)' : m.winner_user_id ? 'var(--text-dim)' : 'var(--text)', fontWeight: m.winner_user_id === m.away_user_id ? 'bold' : 'normal' }}>
                        {label(m.away_user_id)}
                      </span>
                      <span style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '18px' }}>{m.away_points.toFixed(1)}</span>
                    </div>
                  </div>
                  {m.winner_user_id && (
                    <span style={{ marginLeft: '16px', color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Final</span>
                  )}
                </div>
              ))}
            </div>
          )
        })
      )}

      {/* ── Commissioner Controls ── */}
      {isCommissioner && (
        <div style={card}>
          <div style={sectionTitle}>Commissioner Controls</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

            {/* ── League Settings ── */}
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>League Settings</p>
              <label style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Playoff Teams</label>
              <select value={playoffTeams} onChange={e => setPlayoffTeams(Number(e.target.value))}
                style={{ display: 'block', width: '100%', backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px', marginBottom: '10px', marginTop: '4px' }}>
                <option value={4}>4 Teams</option>
                <option value={6}>6 Teams</option>
                <option value={8}>8 Teams</option>
              </select>
              <label style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Tiebreaker</label>
              <select value={tiebreaker} onChange={e => setTiebreaker(e.target.value)}
                style={{ display: 'block', width: '100%', backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px', marginBottom: '12px', marginTop: '4px' }}>
                <option value="points">Total Points</option>
                <option value="money_won">Most Money Won</option>
                <option value="head_to_head">Head to Head</option>
              </select>
              {/* ── Save Settings Button ── */}
              <button onClick={() => act(() => axios.patch(`${API_URL}/leagues/${activeLeague.id}/playoffs/settings`, { playoff_teams: playoffTeams, tiebreaker }, { headers }))}
                style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                Save Settings
              </button>
            </div>

            {/* ── Bracket Actions ── */}
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '10px' }}>Bracket Actions</p>
              {/* ── Generate Bracket Button ── */}
              <button onClick={() => act(() => axios.post(`${API_URL}/leagues/${activeLeague.id}/playoffs/bracket`, {}, { headers }))}
                style={{ display: 'block', width: '100%', backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', marginBottom: '10px' }}>
                Generate Bracket
              </button>

              {/* ── Score Week ── */}
              <label style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Score Week</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px', marginBottom: '10px' }}>
                <select value={scoreWeek} onChange={e => setScoreWeek(Number(e.target.value))}
                  style={{ flex: 1, backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px' }}>
                  <option value={15}>Week 15</option>
                  <option value={16}>Week 16</option>
                  <option value={17}>Week 17</option>
                </select>
                <button onClick={() => act(() => axios.post(`${API_URL}/leagues/${activeLeague.id}/playoffs/score`, { week: scoreWeek }, { headers }))}
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
                  Score
                </button>
              </div>

              {/* ── Advance Round ── */}
              <label style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Advance After Week</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <select value={advanceWeek} onChange={e => setAdvanceWeek(Number(e.target.value))}
                  style={{ flex: 1, backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px' }}>
                  <option value={15}>Week 15</option>
                  <option value={16}>Week 16</option>
                </select>
                <button onClick={() => act(() => axios.post(`${API_URL}/leagues/${activeLeague.id}/playoffs/advance`, { completed_week: advanceWeek }, { headers }))}
                  style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer', fontSize: '13px' }}>
                  Advance
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────
// default export is declared on the function above
