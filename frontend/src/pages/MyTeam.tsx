
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
    <div>
      <h1>My Team</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {saved && <p style={{ color: 'green' }}>Lineup saved!</p>}

      <h2>Week {CURRENT_WEEK} Lineup</h2>
      <table>
        <thead>
          <tr>
            <th>Slot</th>
            <th>Player</th>
          </tr>
        </thead>
        <tbody>
          {SLOTS.map((slot) => (
            <tr key={slot}>
              <td><strong>{slot}</strong></td>
              <td>
                <select
                  value={lineup[slot] || ''}
                  onChange={(e) => handleSlotChange(slot, e.target.value)}
                >
                  <option value="">-- Empty --</option>
                  {roster.map((p) => (
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

        {scores.length > 0 && (
          <>
            <h2>Week {CURRENT_WEEK} Scores</h2>
            <table>
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {scores
                  .sort((a, b) => b.total_points - a.total_points)
                  .map((s) => (
                    <tr key={s.user_id}>
                      <td>{s.user_id === user?.id ? 'You' : s.user_id.slice(0, 8)}</td>
                      <td><strong>{s.total_points}</strong></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        )}



      <button onClick={handleSave}>Save Lineup</button>

      <h2>Full Roster</h2>
      {roster.map((p) => (
        <div key={p.player_id}>
          <span>Rd {p.round}, Pick {p.pick_number} — {p.name} ({p.position} - {p.nfl_team})</span>
        </div>
      ))}
    </div>
  )
}
