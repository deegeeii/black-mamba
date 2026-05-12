
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

interface RosterPlayer {
  player_id: string
  name: string
  position: string
  nfl_team: string | null
  round: number
  pick_number: number
}

interface LineupSlot {
  player_id: string
  slot: string
}

const SLOTS = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'BN']
const CURRENT_WEEK = 1

export default function MyTeam() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const { session, user } = useAuth()
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [lineup, setLineup] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [scores, setScores] = useState<{ user_id: string; total_points: number }[]>([])

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${session?.access_token}` }),
    [session?.access_token]
  )

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rosterRes, lineupRes, scoreRes] = await Promise.all([
          axios.get(`${API_URL}/leagues/${leagueId}/roster`, { headers }),
          axios.get(`${API_URL}/leagues/${leagueId}/lineup?week=${CURRENT_WEEK}`, { headers }),
          axios.get(`${API_URL}/leagues/${leagueId}/scores?week=${CURRENT_WEEK}`, { headers }),
        ])
        setRoster(rosterRes.data)
        setScores(scoreRes.data)
        const slots: Record<string, string> = {}
        lineupRes.data.forEach((s: LineupSlot) => {
          slots[s.slot] = s.player_id
        })
        setLineup(slots)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleSlotChange = (slot: string, playerId: string) => {
    setLineup((prev) => ({ ...prev, [slot]: playerId }))
    setSaved(false)
  }

  const handleSave = async () => {
    setError('')
    try {
      await axios.post(
        `${API_URL}/leagues/${leagueId}/lineup`,
        { week: CURRENT_WEEK, slots: lineup },
        { headers }
      )
      setSaved(true)
    } catch {
      setError('Failed to save lineup')
    }
  }

  if (loading) return <p>Loading your team...</p>

  return (
    <div style={{ maxWidth: '800px' }}>
        <h1 style={{ marginBottom: '4px' }}>My Team</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>Week {CURRENT_WEEK} Lineup</p>

        {error && <p style={{ color: 'var(--danger)', marginBottom: '12px' }}>{error}</p>}
        {saved && <p style={{ color: 'var(--accent)', marginBottom: '12px' }}>Lineup saved!</p>}

        {/* Lineup */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <th style={{ padding: '12px 16px', color: 'var(--text-dim)', textAlign: 'left', fontWeight: 'normal', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const, width: '80px' }}>Slot</th>
                        <th style={{ padding: '12px 16px', color: 'var(--text-dim)', textAlign: 'left', fontWeight: 'normal', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Player</th>
                    </tr>
                </thead>
                <tbody>
                    {SLOTS.map(slot => (
                        <tr key={slot} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '12px 16px', color: 'var(--accent)', fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px' }}>{slot}</td>
                            <td style={{ padding: '12px 16px' }}>
                                <select
                                    value={lineup[slot] || ''}
                                    onChange={e => handleSlotChange(slot, e.target.value)}
                                    style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', color: 'var(--text)', fontSize: '13px', width: '100%' }}
                                >
                                    <option value="">— Empty —</option>
                                    {roster.map(p => (
                                        <option key={p.player_id} value={p.player_id}>
                                            {p.name} ({p.position} - {p.nfl_team})
                                        </option>
                                    ))}
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <button onClick={handleSave} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '32px' }}>
            Save Lineup
        </button>

        {/* Scores */}
        {scores.length > 0 && (
            <>
                <h2 style={{ marginBottom: '12px' }}>Week {CURRENT_WEEK} Scores</h2>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '32px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', textAlign: 'left', fontWeight: 'normal', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Team</th>
                                <th style={{ padding: '12px 16px', color: 'var(--text-dim)', textAlign: 'right', fontWeight: 'normal', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Points</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scores.sort((a, b) => b.total_points - a.total_points).map((s, i) => (
                                <tr key={s.user_id} style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: s.user_id === user?.id ? 'var(--accent-dark)' : 'transparent' }}>
                                    <td style={{ padding: '12px 16px', color: s.user_id === user?.id ? 'var(--accent)' : 'var(--text)' }}>
                                        {i + 1}. {s.user_id === user?.id ? 'You' : s.user_id.slice(0, 8)}
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontWeight: 'bold', textAlign: 'right' }}>{s.total_points}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        )}

        {/* Full Roster */}
        <h2 style={{ marginBottom: '12px' }}>Full Roster</h2>
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 0' }}>
            {roster.map((p, i) => (
                <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < roster.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                    <span style={{ color: 'var(--text)' }}>{p.name}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{p.position} · {p.nfl_team} · Rd {p.round} Pk {p.pick_number}</span>
                </div>
            ))}
        </div>
    </div>
  )

}
