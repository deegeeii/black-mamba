import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
const CURRENT_WEEK = 1


interface Trade {
    id: string
    proposer_id: string
    opponent_id: string
    offer_player_ids: string[]
    request_player_ids: string[]
    status: string
    week: number
    created_at: string
}

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
    marginBottom: '16px',
}

const badge = (status: string): React.CSSProperties => ({
    fontSize: '11px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    padding: '2px 8px',
    borderRadius: '4px',
    color:  status === 'accepted' ? 'var(--accent)' :
            status === 'pending' ? 'var(--warning)' : 'var(--text-dim)',
    backgroundColor:    status === 'accepted' ? 'var(--accent-dark)' :
                        status === 'pending' ? '#2a1f00' : 'var(--bg-input)',
})

export default function Trades() {
    const { session, user } = useAuth()
    const { activeLeague } = useLeague()


    const [trades, setTrades] = useState<Trade[]>([])
    const [myRoster, setMyRoster ] = useState<RosterPlayer[]>([])
    const [allPlayers, setAllPlayers ] = useState<Record<string, Player>>({})
    const [members, setMembers] = useState<{ user_id: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [showPropose, setShowPropose] = useState(false)
    const [opponentId, setOpponentId] = useState('')
    const [opponentRoster, setOpponentRoster] = useState<RosterPlayer[]>([])
    const [offerIds, setOfferIds] = useState<string[]>([])
    const [requestIds, setRequestIds] = useState<string[]>([])
    const [error, setError] = useState('')

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}` }),
        [session?.access_token]
      )
    
      const fetchData = () => {
        if (!activeLeague || !session) return
        const id = activeLeague.id
        Promise.allSettled([
          axios.get(`${API_URL}/leagues/${id}/trades`, { headers }),
          axios.get(`${API_URL}/leagues/${id}/roster`, { headers }),
          axios.get(`${API_URL}/leagues/${id}/members`, { headers }),
          axios.get(`${API_URL}/players`, { headers }),
        ]).then(([t, r, m, p]) => {
          if (t.status === 'fulfilled') setTrades(t.value.data)
          if (r.status === 'fulfilled') setMyRoster(r.value.data.map((p: any) => ({ id: p.player_id, name: p.name, position: p.position, nfl_team: p.nfl_team })))
          if (m.status === 'fulfilled') setMembers(m.value.data.filter((m: any) => m.user_id !== user?.id))
          if (p.status === 'fulfilled') {
            const map: Record<string, Player> = {}
            p.value.data.forEach((pl: Player) => { map[pl.id] = pl })
            setAllPlayers(map)
          }
          setLoading(false)
        })
      }
    
      useEffect(() => { fetchData() }, [activeLeague, session])
    
      useEffect(() => {
        if (!opponentId || !activeLeague) return
        axios.get(`${API_URL}/leagues/${activeLeague.id}/roster?user_id=${opponentId}`, { headers })
          .then(res => setOpponentRoster(res.data.map((p: any) => ({ id: p.player_id, name: p.name, position: p.position, nfl_team: p.nfl_team }))))
          .catch(() => setOpponentRoster([]))
      }, [opponentId])
    
      const toggleSelect = (id: string, list: string[], setList: (v: string[]) => void) => {
        setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
      }
    
      const handlePropose = async () => {
        if (!activeLeague || !opponentId || offerIds.length === 0 || requestIds.length === 0) {
          setError('Select an opponent, at least one player to offer, and one to request.')
          return
        }
        setError('')
        try {
          await axios.post(`${API_URL}/leagues/${activeLeague.id}/trades`, {
            opponent_id: opponentId,
            offer_player_ids: offerIds,
            request_player_ids: requestIds,
            week: CURRENT_WEEK,
          }, { headers })
          setShowPropose(false)
          setOpponentId('')
          setOfferIds([])
          setRequestIds([])
          fetchData()
        } catch (e: any) {
          setError(e.response?.data?.detail || 'Failed to propose trade')
        }
      }
    
      const handleRespond = async (tradeId: string, action: string) => {
        if (!activeLeague) return
        try {
          await axios.patch(`${API_URL}/leagues/${activeLeague.id}/trades/${tradeId}`, { action }, { headers })
          fetchData()
        } catch (e: any) {
          setError(e.response?.data?.detail || 'Action failed')
        }
      }
    
      const playerName = (id: string) => allPlayers[id]?.name || id.slice(0, 8)
    
      const incoming = trades.filter(t => t.opponent_id === user?.id && t.status === 'pending')
      const outgoing = trades.filter(t => t.proposer_id === user?.id && t.status === 'pending')
      const history = trades.filter(t => t.status !== 'pending')
    
      if (!activeLeague) return <p style={{ color: 'var(--text-dim)' }}>Select a league from the sidebar.</p>
      if (loading) return <p>Loading trades...</p>
    
      return (
        <div style={{ maxWidth: '900px', color: 'var(--text)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 style={{ marginBottom: '4px' }}>Trades</h1>
              <p style={{ color: 'var(--text-dim)' }}>{activeLeague.name}</p>
            </div>
            <button
              onClick={() => setShowPropose(true)}
              style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Propose Trade
            </button>
          </div>
    
          {error && <p style={{ color: 'var(--danger)', marginBottom: '12px' }}>{error}</p>}
    
          {/* Incoming */}
          <div style={card}>
            <div style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Incoming ({incoming.length})
            </div>
            {incoming.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No incoming trade offers.</p>}
            {incoming.map(t => (
              <div key={t.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ fontSize: '13px' }}>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>They offer: <span style={{ color: 'var(--accent)' }}>{t.offer_player_ids.map(playerName).join(', ')}</span></p>
                    <p style={{ color: 'var(--text-muted)' }}>They want: <span style={{ color: 'var(--warning)' }}>{t.request_player_ids.map(playerName).join(', ')}</span></p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleRespond(t.id, 'accept')} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Accept</button>
                    <button onClick={() => handleRespond(t.id, 'reject')} style={{ backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: '12px', cursor: 'pointer' }}>Reject</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
    
          {/* Outgoing */}
          <div style={card}>
            <div style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Outgoing ({outgoing.length})
            </div>
            {outgoing.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No pending outgoing offers.</p>}
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
    
          {/* History */}
          {history.length > 0 && (
            <div style={card}>
              <div style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px' }}>History</div>
              {history.map(t => (
                <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {t.offer_player_ids.map(playerName).join(', ')} ↔ {t.request_player_ids.map(playerName).join(', ')}
                  </span>
                  <span style={badge(t.status)}>{t.status}</span>
                </div>
              ))}
            </div>
          )}
    
          {/* Propose Modal */}
          {showPropose && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
              <div style={{ ...card, width: '560px', maxHeight: '80vh', overflowY: 'auto', marginBottom: 0 }}>
                <h3 style={{ marginBottom: '16px' }}>Propose Trade</h3>
    
                <label style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase' }}>Opponent</label>
                <select
                  value={opponentId}
                  onChange={e => { setOpponentId(e.target.value); setRequestIds([]) }}
                  style={{ width: '100%', backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: '14px', marginBottom: '16px', marginTop: '6px' }}
                >
                  <option value=''>Select opponent...</option>
                  {members.map(m => <option key={m.user_id} value={m.user_id}>{m.user_id.slice(0, 8)}</option>)}
                </select>
    
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Your Players (offering)</div>
                    {myRoster.map(p => (
                      <div key={p.id} onClick={() => toggleSelect(p.id, offerIds, setOfferIds)}
                        style={{ padding: '8px', borderRadius: '6px', marginBottom: '4px', cursor: 'pointer', backgroundColor: offerIds.includes(p.id) ? 'var(--accent-dark)' : 'var(--bg-input)', border: `1px solid ${offerIds.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`, fontSize: '13px', color: offerIds.includes(p.id) ? 'var(--accent)' : 'var(--text)' }}>
                        {p.name} <span style={{ color: 'var(--text-dim)' }}>({p.position})</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Their Players (requesting)</div>
                    {opponentId && opponentRoster.length === 0 && <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>No players on their roster.</p>}
                    {!opponentId && <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Select an opponent first.</p>}
                    {opponentRoster.map(p => (
                      <div key={p.id} onClick={() => toggleSelect(p.id, requestIds, setRequestIds)}
                        style={{ padding: '8px', borderRadius: '6px', marginBottom: '4px', cursor: 'pointer', backgroundColor: requestIds.includes(p.id) ? 'var(--accent-dark)' : 'var(--bg-input)', border: `1px solid ${requestIds.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`, fontSize: '13px', color: requestIds.includes(p.id) ? 'var(--accent)' : 'var(--text)' }}>
                        {p.name} <span style={{ color: 'var(--text-dim)' }}>({p.position})</span>
                      </div>
                    ))}
                  </div>
                </div>
    
                {error && <p style={{ color: 'var(--danger)', marginTop: '12px', fontSize: '13px' }}>{error}</p>}
    
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                  <button onClick={() => { setShowPropose(false); setError('') }} style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
                  <button onClick={handlePropose} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontWeight: 'bold', cursor: 'pointer' }}>Send Offer</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )
}
    