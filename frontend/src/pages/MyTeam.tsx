
// ── IMPORTS ────────────────────────────────────────────────────────────────────
import type { CSSProperties } from 'react'
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'
import { useLeague } from '../contexts/LeagueContext'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL
const CURRENT_WEEK = 1
const POSITIONS = ['', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

// ── INTERFACES / TYPES ─────────────────────────────────────────────────────────
interface RosterPlayer {
  player_id: string
  name: string
  position: string
  nfl_team: string | null
  round: number
  pick_number: number
}

interface LineupSlot { player_id: string; slot: string }
interface FreeAgent { id: string; name: string; position: string; nfl_team: string | null }

interface Trade {
  id: string
  proposer_id: string
  opponent_id: string
  offer_player_ids: string[]
  request_player_ids: string[]
  status: string
  week: number
}

// ── STYLE CONSTANTS ────────────────────────────────────────────────────────────
const card: CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px',
  marginBottom: '16px',
}

const sectionTitle: CSSProperties = {
  color: 'var(--accent)',
  fontSize: '11px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  marginBottom: '12px',
}

export default function MyTeam() {
  // ── STATE ──────────────────────────────────────────────────────────────────
  const { leagueId } = useParams<{ leagueId: string }>()
  const { session, user } = useAuth()
  const { getTeamName, activeLeague } = useLeague()
  const [tab, setTab] = useState<'roster' | 'free-agents' | 'trades' | 'keepers'>('roster')

  // Roster state
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [lineup, setLineup] = useState<Record<string, string>>({})
  const [, setScores] = useState<{ user_id: string; total_points: number }[]>([])
  const [dropping, setDropping] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Free agents state
  const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([])
  const [position, setPosition] = useState('')
  const [search, setSearch] = useState('')
  const [dropModal, setDropModal] = useState<FreeAgent | null>(null)
  const [dropTarget, setDropTarget] = useState('')

  // Trades state
  const [trades, setTrades] = useState<Trade[]>([])
  const [allPlayers, setAllPlayers] = useState<Record<string, FreeAgent>>({})
  const [members, setMembers] = useState<{ user_id: string; role?: string }[]>([])
  const [showPropose, setShowPropose] = useState(false)
  const [opponentId, setOpponentId] = useState('')
  const [opponentRoster, setOpponentRoster] = useState<FreeAgent[]>([])
  const [offerIds, setOfferIds] = useState<string[]>([])
  const [requestIds, setRequestIds] = useState<string[]>([])

  // Keepers state
  const [keepers, setKeepers] = useState<{ player_id: string; cost_round: number }[]>([])
  const [keeperMax, setKeeperMax] = useState(2)
  const [keeperLoading, setKeeperLoading] = useState(false)
  

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const headers = useMemo(
    () => ({ Authorization: `Bearer ${session?.access_token}` }),
    [session?.access_token]
  )

  const slots = useMemo(() => {
    const base = ['QB', 'RB', 'WR', 'TE', 'FLEX']
    if (activeLeague?.scoring_type === 'standard_plus') base.push('SFLEX')
    base.push('K', 'BN')
    return base
  }, [activeLeague?.scoring_type])


  // ── HELPERS ────────────────────────────────────────────────────────────────
  const fetchRoster = () =>
    axios.get(`${API_URL}/leagues/${leagueId}/roster`, { headers }).then(r => setRoster(r.data))

  const fetchFreeAgents = () => {
    const params: Record<string, string> = {}
    if (position) params.position = position
    if (search) params.search = search
    return axios.get(`${API_URL}/leagues/${leagueId}/free-agents`, { headers, params }).then(r => setFreeAgents(r.data))
  }

  const fetchTrades = () =>
    axios.get(`${API_URL}/leagues/${leagueId}/trades`, { headers }).then(r => setTrades(r.data))

  // ── EFFECTS / FETCH ON MOUNT ───────────────────────────────────────────────
  useEffect(() => {
    if (!leagueId || !session) return
    Promise.allSettled([
      axios.get(`${API_URL}/leagues/${leagueId}/roster`, { headers }),
      axios.get(`${API_URL}/leagues/${leagueId}/lineup?week=${CURRENT_WEEK}`, { headers }),
      axios.get(`${API_URL}/leagues/${leagueId}/scores?week=${CURRENT_WEEK}`, { headers }),
      axios.get(`${API_URL}/leagues/${leagueId}/free-agents`, { headers }),
      axios.get(`${API_URL}/leagues/${leagueId}/trades`, { headers }),
      axios.get(`${API_URL}/leagues/${leagueId}/members`, { headers }),
      axios.get(`${API_URL}/draft/players`, { headers }),
      activeLeague?.scoring_type === 'dynasty'
      ? axios.get(`${API_URL}/leagues/${leagueId}/keepers`, { headers })
      : Promise.resolve({ data: [] }),
    ]).then(([r, l, sc, fa, t, m, p, k]) => {
      if (r.status === 'fulfilled') setRoster(r.value.data)
      if (l.status === 'fulfilled') {
        const slots: Record<string, string> = {}
        l.value.data.forEach((s: LineupSlot) => { slots[s.slot] = s.player_id })
        setLineup(slots)
      }
      if (sc.status === 'fulfilled') setScores(sc.value.data)
      if (fa.status === 'fulfilled') setFreeAgents(fa.value.data)
      if (t.status === 'fulfilled') setTrades(t.value.data)
      if (m.status === 'fulfilled') setMembers(m.value.data.filter((x: { user_id: string }) => x.user_id !== user?.id))
      if (p.status === 'fulfilled') {
          const map: Record<string, FreeAgent> = {}
          p.value.data.forEach((pl: FreeAgent) => { map[pl.id] = pl })
          setAllPlayers(map)
        }
      if (k.status === 'fulfilled') {
        setKeepers(k.value.data)
        setKeeperMax(2)
      }
      setLoading(false)
    })
  }, [leagueId, session, headers])

  useEffect(() => { if (tab === 'free-agents') fetchFreeAgents() }, [tab, position, search, leagueId, headers])

  useEffect(() => {
    if (!opponentId) return
    axios.get(`${API_URL}/leagues/${leagueId}/roster?target_user_id=${opponentId}`, { headers })
      .then(r => setOpponentRoster(r.data.map((p: { player_id: string; name: string; position: string; nfl_team: string | null }) => ({ id: p.player_id, name: p.name, position: p.position, nfl_team: p.nfl_team }))))
      .catch(() => setOpponentRoster([]))
  }, [opponentId, leagueId, headers])

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const handleSlotChange = (slot: string, playerId: string) => {
    setLineup(prev => ({ ...prev, [slot]: playerId }))
    setSaved(false)
  }

  const handleSaveLineup = async () => {
    setError('')
    try {
      await axios.post(`${API_URL}/leagues/${leagueId}/lineup`, { week: CURRENT_WEEK, slots: lineup }, { headers })
      setSaved(true)
    } catch { setError('Failed to save lineup') }
  }

  const handleDrop = async (playerId: string) => {
    setError('')
    try {
      await axios.post(`${API_URL}/leagues/${leagueId}/roster/drop`, { player_id: playerId, week: CURRENT_WEEK }, { headers })
      setRoster(prev => prev.filter(p => p.player_id !== playerId))
      setDropping(null)
      fetchFreeAgents()
    } catch { setError('Failed to drop player') }
  }

  const handleAdd = (player: FreeAgent) => {
    if (roster.length >= 15) { setDropModal(player); setDropTarget('') }
    else confirmAdd(player.id, null)
  }

  const confirmAdd = async (playerId: string, dropPlayerId: string | null) => {
    setError('')
    try {
      await axios.post(`${API_URL}/leagues/${leagueId}/roster/add`, { player_id: playerId, drop_player_id: dropPlayerId || null, week: CURRENT_WEEK }, { headers })
      setDropModal(null)
      fetchRoster()
      fetchFreeAgents()
    } catch (e: any) { setError(e.response?.data?.detail || 'Failed to add player') }
  }

  const toggleSelect = (id: string, list: string[], setList: (v: string[]) => void) =>
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])

  const handlePropose = async () => {
    if (!opponentId || offerIds.length === 0 || requestIds.length === 0) {
      setError('Select an opponent and at least one player on each side.')
      return
    }
    setError('')
    try {
      await axios.post(`${API_URL}/leagues/${leagueId}/trades`, { opponent_id: opponentId, offer_player_ids: offerIds, request_player_ids: requestIds, week: CURRENT_WEEK }, { headers })
      setShowPropose(false); setOpponentId(''); setOfferIds([]); setRequestIds([])
      fetchTrades()
    } catch (e: any) { setError(e.response?.data?.detail || 'Failed to propose trade') }
  }

  const handleRespond = async (tradeId: string, action: string) => {
    setError('')
    try {
      await axios.patch(`${API_URL}/leagues/${leagueId}/trades/${tradeId}`, { action }, { headers })
      fetchTrades(); fetchRoster()
    } catch (e: any) { setError(e.response?.data?.detail || 'Action failed') }
  }

  const handleDeclareKeeper = async (playerId: string) => {
    setKeeperLoading(true)
    try {
      const res = await axios.post(
        `${API_URL}/leagues/${leagueId}/keepers`,
        { player_id: playerId },
        { headers }
      )
      setKeepers(prev => [...prev, res.data])
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Failed to declare keeper')
    } finally {
      setKeeperLoading(false)
    }
  }

  const handleRemoveKeeper = async (playerId: string) => {
    setKeeperLoading(true)
    try {
      await axios.delete(`${API_URL}/leagues/${leagueId}/keepers/${playerId}`, { headers })
      setKeepers(prev => prev.filter(k => k.player_id !== playerId))
    } catch {
      setError('Failed to remove keeper')
    } finally {
      setKeeperLoading(false)
    }
  }


  // ── HELPERS ────────────────────────────────────────────────────────────────
  const playerName = (id: string) => allPlayers[id]?.name || id.slice(0, 8)
  const incoming = trades.filter(t => t.opponent_id === user?.id && t.status === 'pending')
  const outgoing = trades.filter(t => t.proposer_id === user?.id && t.status === 'pending')
  const history = trades.filter(t => t.status !== 'pending')

  const tabStyle = (t: string): CSSProperties => ({
    padding: '10px 20px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: tab === t ? 'bold' : 'normal',
    color: tab === t ? 'var(--accent)' : 'var(--text-dim)',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
  })


  if (loading) return <p>Loading...</p>

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '900px', color: 'var(--text)' }}>
      <h1 style={{ marginBottom: '4px' }}>My Team</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: '16px' }}>Week {CURRENT_WEEK}</p>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        <button style={tabStyle('roster')} onClick={() => setTab('roster')}>Roster</button>
        <button style={tabStyle('free-agents')} onClick={() => setTab('free-agents')}>Free Agents</button>
        
        <button style={tabStyle('trades')} onClick={() => setTab('trades')}>Trades</button>
        {activeLeague?.scoring_type === 'dynasty' && (
          <button style={tabStyle('keepers')} onClick={() => setTab('keepers')}>Keepers</button>
        )}

      </div>

      {error && <p style={{ color: 'var(--danger)', marginBottom: '12px' }}>{error}</p>}

      {/* ── ROSTER TAB ── */}
      {tab === 'roster' && (
        <>
          {saved && <p style={{ color: 'var(--accent)', marginBottom: '12px' }}>Lineup saved!</p>}

          {/* ── Lineup Slot Table ── */}
          <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: '16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-dim)', textAlign: 'left', fontWeight: 'normal', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', width: '80px' }}>Slot</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-dim)', textAlign: 'left', fontWeight: 'normal', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Player</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr key={slot} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--accent)', fontWeight: 'bold', fontSize: '12px', letterSpacing: '1px' }}>{slot}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <select value={lineup[slot] || ''} onChange={e => handleSlotChange(slot, e.target.value)}
                        style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 10px', color: 'var(--text)', fontSize: '13px', width: '100%' }}>
                        <option value=''>— Empty —</option>
                        {roster.map(p => <option key={p.player_id} value={p.player_id}>{p.name} ({p.position} - {p.nfl_team})</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Save Lineup Button ── */}
          <button onClick={handleSaveLineup} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', cursor: 'pointer', fontWeight: 'bold', marginBottom: '24px' }}>
            Save Lineup
          </button>

          {/* ── Full Roster List ── */}
          <h2 style={{ marginBottom: '12px' }}>Full Roster ({roster.length}/15)</h2>
          <div style={{ ...card }}>
            {roster.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No players yet.</p>}
            {roster.map((p, i) => (
              <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < roster.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <div>
                  <span style={{ color: 'var(--text)' }}>{p.name}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '13px', marginLeft: '10px' }}>{p.position} · {p.nfl_team}{p.round > 0 ? ` · Rd ${p.round} Pk ${p.pick_number}` : ' · FA'}</span>
                </div>
                {dropping === p.player_id ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--text-dim)', fontSize: '13px', alignSelf: 'center' }}>Confirm?</span>
                    <button onClick={() => handleDrop(p.player_id)} style={{ backgroundColor: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}>Yes</button>
                    <button onClick={() => setDropping(null)} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}>No</button>
                  </div>
                ) : (
                  <button onClick={() => setDropping(p.player_id)} style={{ backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '4px 12px', fontSize: '12px', cursor: 'pointer' }}>Drop</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── FREE AGENTS TAB ── */}
      {tab === 'free-agents' && (
        <>
          {/* ── Search + Filter Controls ── */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <select value={position} onChange={e => setPosition(e.target.value)}
              style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: '14px' }}>
              {POSITIONS.map(p => <option key={p} value={p}>{p || 'All Positions'}</option>)}
            </select>
            <input placeholder='Search player...' value={search} onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: '14px' }} />
          </div>

          {/* ── Free Agent List ── */}
          <div style={card}>
            <div style={sectionTitle}>Available ({freeAgents.length})</div>
            {freeAgents.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No players found.</p>}
            {freeAgents.map(player => (
              <div key={player.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{player.name}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '12px', marginLeft: '10px' }}>{player.position} · {player.nfl_team || '—'}</span>
                </div>
                <button onClick={() => handleAdd(player)} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>Add</button>
              </div>
            ))}
          </div>

          {/* ── Drop Modal ── */}
          {dropModal && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ ...card, width: '400px', marginBottom: 0 }}>
                <h3 style={{ marginBottom: '8px' }}>Roster Full</h3>
                <p style={{ color: 'var(--text-dim)', marginBottom: '16px', fontSize: '14px' }}>Adding <strong style={{ color: 'var(--accent)' }}>{dropModal.name}</strong> requires dropping a player.</p>
                <select value={dropTarget} onChange={e => setDropTarget(e.target.value)}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px', marginBottom: '16px' }}>
                  <option value=''>Select player to drop...</option>
                  {roster.map(p => <option key={p.player_id} value={p.player_id}>{p.name} ({p.position})</option>)}
                </select>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={() => setDropModal(null)} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={() => dropTarget && confirmAdd(dropModal.id, dropTarget)} disabled={!dropTarget}
                    style={{ backgroundColor: dropTarget ? 'var(--accent)' : 'var(--border)', color: dropTarget ? '#000' : 'var(--text-dim)', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 'bold', cursor: dropTarget ? 'pointer' : 'default' }}>Confirm</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TRADES TAB ── */}
      {tab === 'trades' && (
        <>
          {/* ── Propose Trade Button ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setShowPropose(true)} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer' }}>Propose Trade</button>
          </div>

          {/* ── Incoming Offers ── */}
          <div style={card}>
            <div style={sectionTitle}>Incoming ({incoming.length})</div>
            {incoming.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No incoming offers.</p>}
            {incoming.map(t => (
              <div key={t.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>They offer: <span style={{ color: 'var(--accent)' }}>{t.offer_player_ids.map(playerName).join(', ')}</span></p>
                  <p style={{ color: 'var(--text-muted)' }}>They want: <span style={{ color: 'var(--warning)' }}>{t.request_player_ids.map(playerName).join(', ')}</span></p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleRespond(t.id, 'accept')} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Accept</button>
                  <button onClick={() => handleRespond(t.id, 'reject')} style={{ backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Outgoing Offers ── */}
          <div style={card}>
            <div style={sectionTitle}>Outgoing ({outgoing.length})</div>
            {outgoing.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No pending offers.</p>}
            {outgoing.map(t => (
              <div key={t.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px' }}>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Offering: <span style={{ color: 'var(--accent)' }}>{t.offer_player_ids.map(playerName).join(', ')}</span></p>
                  <p style={{ color: 'var(--text-muted)' }}>Requesting: <span style={{ color: 'var(--warning)' }}>{t.request_player_ids.map(playerName).join(', ')}</span></p>
                </div>
                <button onClick={() => handleRespond(t.id, 'cancel')} style={{ backgroundColor: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              </div>
            ))}
          </div>

          {/* ── Trade History ── */}
          {history.length > 0 && (
            <div style={card}>
              <div style={sectionTitle}>History</div>
              {history.map(t => (
                <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{t.offer_player_ids.map(playerName).join(', ')} ↔ {t.request_player_ids.map(playerName).join(', ')}</span>
                  <span style={{ color: t.status === 'accepted' ? 'var(--accent)' : 'var(--text-dim)', textTransform: 'uppercase', fontSize: '11px', fontWeight: 'bold' }}>{t.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Propose Trade Modal ── */}
          {showPropose && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ ...card, width: '560px', maxHeight: '80vh', overflowY: 'auto', marginBottom: 0 }}>
                <h3 style={{ marginBottom: '16px' }}>Propose Trade</h3>
                {/* ── Opponent Selector ── */}
                <label style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Opponent</label>
                <select value={opponentId} onChange={e => { setOpponentId(e.target.value); setRequestIds([]) }}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px', marginBottom: '16px', marginTop: '6px' }}>
                  <option value=''>Select opponent...</option>
                  {members.map(m => <option key={m.user_id} value={m.user_id}>{getTeamName(m.user_id)}</option>)}
                </select>
                {/* ── Player Selection Grid ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Your Players</div>
                    {roster.map(p => (
                      <div key={p.player_id} onClick={() => toggleSelect(p.player_id, offerIds, setOfferIds)}
                        style={{ padding: '8px', borderRadius: '6px', marginBottom: '4px', cursor: 'pointer', backgroundColor: offerIds.includes(p.player_id) ? 'var(--accent-dark)' : 'var(--bg-input)', border: `1px solid ${offerIds.includes(p.player_id) ? 'var(--accent)' : 'var(--border)'}`, fontSize: '13px', color: offerIds.includes(p.player_id) ? 'var(--accent)' : 'var(--text)' }}>
                        {p.name} <span style={{ color: 'var(--text-dim)' }}>({p.position})</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Their Players</div>
                    {!opponentId && <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Select opponent first.</p>}
                    {opponentId && opponentRoster.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>No players on their roster.</p>}
                    {opponentRoster.map(p => (
                      <div key={p.id} onClick={() => toggleSelect(p.id, requestIds, setRequestIds)}
                        style={{ padding: '8px', borderRadius: '6px', marginBottom: '4px', cursor: 'pointer', backgroundColor: requestIds.includes(p.id) ? 'var(--accent-dark)' : 'var(--bg-input)', border: `1px solid ${requestIds.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`, fontSize: '13px', color: requestIds.includes(p.id) ? 'var(--accent)' : 'var(--text)' }}>
                        {p.name} <span style={{ color: 'var(--text-dim)' }}>({p.position})</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* ── Modal Actions ── */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button onClick={() => { setShowPropose(false); setError('') }} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handlePropose} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}>Send Offer</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── KEEPERS TAB ── */}
      {tab === 'keepers' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ marginBottom: '4px' }}>Keepers</h2>
              <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                {keepers.length}/{keeperMax} keepers declared
              </p>
            </div>
          </div>

          <div style={card}>
            <div style={sectionTitle}>Your Roster — Select Keepers</div>
            {roster.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No players on your roster.</p>}
            {roster.map((p, i) => {
              const kept = keepers.find(k => k.player_id === p.player_id)
              return (
                <div
                  key={p.player_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: i < roster.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{p.name}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '13px', marginLeft: '10px' }}>
                      {p.position} · {p.nfl_team || '—'}
                    </span>
                    {kept && (
                      <span style={{
                        marginLeft: '10px',
                        fontSize: '11px',
                        border: '1px solid var(--accent)',
                        borderRadius: '10px',
                        padding: '2px 8px',
                        color: 'var(--accent)',
                      }}>
                        Rd {kept.cost_round} cost
                      </span>
                    )}
                  </div>
                  {kept ? (
                    <button
                      onClick={() => handleRemoveKeeper(p.player_id)}
                      disabled={keeperLoading}
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--danger)',
                        border: '1px solid var(--danger)',
                        borderRadius: 'var(--radius)',
                        padding: '4px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDeclareKeeper(p.player_id)}
                      disabled={keeperLoading || keepers.length >= keeperMax}
                      style={{
                        backgroundColor: keepers.length >= keeperMax ? 'var(--border)' : 'var(--accent)',
                        color: keepers.length >= keeperMax ? 'var(--text-dim)' : '#000',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        padding: '4px 12px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: keepers.length >= keeperMax ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Keep
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {keepers.length > 0 && (
            <div style={card}>
              <div style={sectionTitle}>Declared Keepers</div>
              {keepers.map(k => {
                const player = roster.find(p => p.player_id === k.player_id)
                return (
                  <div key={k.player_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '14px' }}>
                    <span>{player?.name || k.player_id}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Round {k.cost_round} pick cost</span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

