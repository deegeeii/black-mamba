

import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

interface Player {
  id: string
  name: string
  position: string
  nfl_team: string | null
  headshot_url: string | null
}

interface DraftSession {
  id: string
  league_id: string
  status: string
  draft_order: string[]
  current_pick: number
  total_rounds: number
}

interface DraftPick {
  id: string
  user_id: string
  player_id: string
  round: number
  pick_number: number
}

export default function DraftRoom() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const { session, user } = useAuth()
  const [players, setPlayers] = useState<Player[]>([])
  const [session_, setSession_] = useState<DraftSession | null>(null)
  const [picks, setPicks] = useState<DraftPick[]>([])
  const [positionFilter, setPositionFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${session?.access_token}` }),
    [session?.access_token]
  )

  const fetchAll = async () => {
    try {
      const [playersRes, picksRes, sessionRes] = await Promise.allSettled([
        axios.get(`${API_URL}/draft/players`, { headers }),
        axios.get(`${API_URL}/draft/${leagueId}/picks`, { headers }),
        axios.get(`${API_URL}/draft/${leagueId}/session`, { headers }),
      ])
      if (playersRes.status === 'fulfilled') setPlayers(playersRes.value.data)
      if (picksRes.status === 'fulfilled') setPicks(picksRes.value.data)
      setSession_(sessionRes.status === 'fulfilled' ? sessionRes.value.data : null)
    } finally {
      setLoading(false)
    }
  }

  const refreshPicksAndSession = async () => {
    const [picksRes, sessionRes] = await Promise.allSettled([
      axios.get(`${API_URL}/draft/${leagueId}/picks`, { headers }),
      axios.get(`${API_URL}/draft/${leagueId}/session`, { headers }),
    ])
    if (picksRes.status === 'fulfilled') setPicks(picksRes.value.data)
    setSession_(sessionRes.status === 'fulfilled' ? sessionRes.value.data : null)
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleStartDraft = async () => {
    try {
      const res = await axios.post(`${API_URL}/draft/${leagueId}/start`, {}, { headers })
      setSession_(res.data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to start draft')
    }
  }

  const handlePick = async (playerId: string) => {
    try {
      await axios.post(
        `${API_URL}/draft/${leagueId}/pick`,
        { player_id: playerId },
        { headers }
      )
      refreshPicksAndSession()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to make pick')
    }
  }

  const pickedPlayerIds = useMemo(
    () => new Set(picks.map((p) => p.player_id)),
    [picks]
  )

  const isMyTurn = () => {
    if (!session_ || session_.status !== 'active') return false
    const { draft_order, current_pick } = session_
    const num = draft_order.length
    const idx = current_pick - 1
    const round = Math.floor(idx / num)
    const position = round % 2 === 0 ? idx % num : num - 1 - (idx % num)
    return draft_order[position] === user?.id
  }

  const filteredPlayers = players.filter((p) => {
    const matchesPos = positionFilter ? p.position === positionFilter : true
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchesPos && matchesSearch && !pickedPlayerIds.has(p.id)
  })

  if (loading) return <p>Loading draft room...</p>

  return (
    <div>
      <h1>Draft Room</h1>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!session_ && (
        <button onClick={handleStartDraft}>Start Draft</button>
      )}

      {session_ && (
        <div>
          <p>Status: <strong>{session_.status}</strong></p>
          <p>Pick: <strong>{session_.current_pick}</strong></p>
          {isMyTurn() && <p style={{ color: 'green' }}><strong>It's your turn!</strong></p>}
        </div>
      )}

      <h2>Draft Board</h2>
      {picks.length === 0 ? (
        <p>No picks yet.</p>
      ) : (
        picks.map((pick) => (
          <div key={pick.id}>
            <span>Round {pick.round}, Pick {pick.pick_number} — {pick.player_id}</span>
          </div>
        ))
      )}

      <h2>Available Players</h2>
      <div>
        <input
          placeholder="Search players..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value)}>
          <option value="">All Positions</option>
          <option value="QB">QB</option>
          <option value="RB">RB</option>
          <option value="WR">WR</option>
          <option value="TE">TE</option>
          <option value="K">K</option>
        </select>
      </div>

      {filteredPlayers.map((player) => (
        <div key={player.id}>
          <span>{player.name} — {player.position} — {player.nfl_team}</span>
          {isMyTurn() && (
            <button onClick={() => handlePick(player.id)}>Draft</button>
          )}
        </div>
      ))}
    </div>
  )
}
