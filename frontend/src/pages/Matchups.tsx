import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
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

export default function Matchups() {
    const { leagueId } = useParams<{ leagueId: string }>()
    const { session, user } = useAuth()
    const [ matchups, setMatchups ] = useState<Matchup[]>([])
    const [ standings, setStandings ] = useState<Standing[]>([])
    const [ loading, setLoading ] = useState(true)

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}` }),
        [session?.access_token]
    )

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [matchupsRes, standingsRes] = await Promise.all([
                    axios.get(`${API_URL}/leagues/${leagueId}/matchups?week=${CURRENT_WEEK}`, { headers }),
                    axios.get(`${API_URL}/leagues/${leagueId}/standings`, { headers }),
                ])
                setMatchups(matchupsRes.data)
                setStandings(standingsRes.data)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])
    
    const label = (userId: string) => userId === user?.id ? 'You' : userId.slice(0, 8)

    if (loading) return <p>Loading matchups...</p>

    return (
      <div style={{ maxWidth: '800px' }}>
          <h1 style={{ marginBottom: '4px' }}>Matchups</h1>
          <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>Week {CURRENT_WEEK}</p>
  
          {matchups.length === 0 ? (
              <p style={{ color: 'var(--text-dim)' }}>No matchups generated yet.</p>
          ) : matchups.map(m => {
              const isMyMatchup = m.home_user_id === user?.id || m.away_user_id === user?.id
              return (
                  <div key={m.id} style={{
                      backgroundColor: 'var(--bg-card)',
                      border: `1px solid ${isMyMatchup ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      padding: '20px',
                      marginBottom: '12px',
                  }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ textAlign: 'center', flex: 1 }}>
                              <div style={{ color: m.home_user_id === user?.id ? 'var(--accent)' : 'var(--text)', fontWeight: 'bold', fontSize: '16px' }}>
                                  {label(m.home_user_id)}
                              </div>
                              <div style={{ fontSize: '28px', fontWeight: 'bold', color: m.winner_user_id === m.home_user_id ? 'var(--accent)' : 'var(--text)', marginTop: '4px' }}>
                                  {m.home_points.toFixed(1)}
                              </div>
                          </div>
                          <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '0 16px' }}>VS</div>
                          <div style={{ textAlign: 'center', flex: 1 }}>
                              <div style={{ color: m.away_user_id === user?.id ? 'var(--accent)' : 'var(--text)', fontWeight: 'bold', fontSize: '16px' }}>
                                  {label(m.away_user_id)}
                              </div>
                              <div style={{ fontSize: '28px', fontWeight: 'bold', color: m.winner_user_id === m.away_user_id ? 'var(--accent)' : 'var(--text)', marginTop: '4px' }}>
                                  {m.away_points.toFixed(1)}
                              </div>
                          </div>
                      </div>
                      {m.winner_user_id && (
                          <div style={{ textAlign: 'center', marginTop: '12px', color: 'var(--accent)', fontSize: '12px', letterSpacing: '1px' }}>
                              WINNER: {label(m.winner_user_id)}
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
                                  {i + 1}. {label(s.user_id)}
                              </td>
                              <td style={{ padding: '12px 16px', color: 'var(--text)', textAlign: 'center' }}>{s.wins}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>{s.losses}</td>
                              <td style={{ padding: '12px 16px', color: 'var(--text-muted)', textAlign: 'center' }}>{s.points_for}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
  )
     
}