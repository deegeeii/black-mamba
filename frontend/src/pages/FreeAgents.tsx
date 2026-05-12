// frontend/src/pages/FreeAgents.tsx

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
const CURRENT_WEEK = 1
const POSITIONS = ['', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

interface Player {
  id: string
  name: string
  position: string
  nfl_team: string | null
}

interface RosterPlayer extends Player {}

const card: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px',
}

export default function FreeAgents() {
  const { session } = useAuth()
  const { activeLeague } = useLeague()

  const [freeAgents, setFreeAgents] = useState<Player[]>([])
  const [myRoster, setMyRoster] = useState<RosterPlayer[]>([])
  const [position, setPosition] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [dropModal, setDropModal] = useState<Player | null>(null)
  const [dropTarget, setDropTarget] = useState('')
  const [error, setError] = useState('')

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${session?.access_token}` }),
    [session?.access_token]
  )

  const fetchData = () => {
    if (!activeLeague || !session) return
    const id = activeLeague.id
    setLoading(true)
    const params: Record<string, string> = {}
    if (position) params.position = position
    if (search) params.search = search

    Promise.allSettled([
      axios.get(`${API_URL}/leagues/${id}/free-agents`, { headers, params }),
      axios.get(`${API_URL}/leagues/${id}/roster`, { headers }),
    ]).then(([fa, r]) => {
      if (fa.status === 'fulfilled') setFreeAgents(fa.value.data)
      if (r.status === 'fulfilled') setMyRoster(r.value.data)
      setLoading(false)
    })
  }

  useEffect(() => { fetchData() }, [activeLeague, session, position, search])

  const handleAdd = (player: Player) => {
    if (myRoster.length >= 15) {
      setDropModal(player)
      setDropTarget('')
    } else {
      confirmAdd(player.id, null)
    }
  }

  const confirmAdd = async (playerId: string, dropPlayerId: string | null) => {
    if (!activeLeague) return
    setError('')
    try {
      await axios.post(
        `${API_URL}/leagues/${activeLeague.id}/roster/add`,
        { player_id: playerId, drop_player_id: dropPlayerId || null, week: CURRENT_WEEK },
        { headers }
      )
      setDropModal(null)
      fetchData()
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to add player')
    }
  }

  if (!activeLeague) return <p style={{ color: 'var(--text-dim)' }}>Select a league from the sidebar.</p>

  return (
    <div style={{ maxWidth: '900px', color: 'var(--text)' }}>
      <h1 style={{ marginBottom: '4px' }}>Free Agents</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>{activeLeague.name}</p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <select
          value={position}
          onChange={e => setPosition(e.target.value)}
          style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: '14px' }}
        >
          {POSITIONS.map(p => <option key={p} value={p}>{p || 'All Positions'}</option>)}
        </select>
        <input
          placeholder="Search player..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: '14px' }}
        />
      </div>

      {error && <p style={{ color: 'var(--danger)', marginBottom: '12px' }}>{error}</p>}

      {/* Free Agent List */}
      <div style={card}>
        <div style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
          Available Players {loading ? '...' : `(${freeAgents.length})`}
        </div>
        {freeAgents.length === 0 && !loading && (
          <p style={{ color: 'var(--text-dim)' }}>No players found.</p>
        )}
        {freeAgents.map(player => (
          <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>{player.name}</span>
              <span style={{ color: 'var(--text-dim)', fontSize: '12px', marginLeft: '10px' }}>{player.position} · {player.nfl_team || '—'}</span>
            </div>
            <button
              onClick={() => handleAdd(player)}
              style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        ))}
      </div>

      {/* Drop Modal */}
      {dropModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ ...card, width: '400px' }}>
            <h3 style={{ marginBottom: '8px' }}>Roster Full</h3>
            <p style={{ color: 'var(--text-dim)', marginBottom: '16px', fontSize: '14px' }}>
              Adding <strong style={{ color: 'var(--accent)' }}>{dropModal.name}</strong> requires dropping a player.
            </p>
            <select
              value={dropTarget}
              onChange={e => setDropTarget(e.target.value)}
              style={{ width: '100%', backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px', marginBottom: '16px' }}
            >
              <option value=''>Select player to drop...</option>
              {myRoster.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.position})</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDropModal(null)} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={() => dropTarget && confirmAdd(dropModal.id, dropTarget)}
                disabled={!dropTarget}
                style={{ backgroundColor: dropTarget ? 'var(--accent)' : 'var(--border)', color: dropTarget ? '#000' : 'var(--text-dim)', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 'bold', cursor: dropTarget ? 'pointer' : 'default' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
