
import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL
const CURRENT_WEEK = 1


interface Standing {
  user_id: string
  wins: number
  losses: number
  points_for: number
}

interface Matchup {
  id: string
  home_user_id: string
  away_user_id: string
  home_points: number
  away_points: number
  winner_user_id: string | null
}

interface Bet {
  id: string
  bet_type: string
  amount: number
  status: string
  proposer_id: string
  opponent_id: string | null
}

interface Tournament {
  id: string
  name: string
  status: string
  ai_brain: string
}

interface MyScore {
  total_points: number
  week: number
}

const card: React.CSSProperties = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px',
  marginBottom: '16px',
}

const cardTitle: React.CSSProperties = {
  color: 'var(--accent)',
  fontSize: '11px',
  letterSpacing: '1px',
  textTransform: 'uppercase',
  marginBottom: '12px',
}


export default function Dashboard() {
  const { user, session } = useAuth()
  const { activeLeague, getTeamName } = useLeague()

  const [standings, setStandings] = useState<Standing[]>([])
  const [matchups, setMatchups] = useState<Matchup[]>([])
  const [bets, setBets] = useState<Bet[]>([])
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [myScore, setMyScore] = useState<MyScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState<string | null>(null)


  const headers = useMemo(
    () => ({ Authorization: `Bearer ${session?.access_token}` }),
    [session?.access_token]
  )

  useEffect(() => {
    if (!activeLeague || !session) return
    const id = activeLeague.id

    Promise.allSettled([
        axios.get(`${API_URL}/leagues/${id}/standings`, { headers }),
        axios.get(`${API_URL}/leagues/${id}/matchups?week=${CURRENT_WEEK}`, { headers }),
        axios.get(`${API_URL}/leagues/${id}/bets`, { headers }),
        axios.get(`${API_URL}/leagues/${id}/tournaments`, { headers }),
        axios.get(`${API_URL}/leagues/${id}/scores/me?week=${CURRENT_WEEK}`, { headers }),
        axios.get(`${API_URL}/profile/`, { headers }),

    ]).then(([s, m, b, t, sc, p]) => {
        if (s.status === 'fulfilled') setStandings(s.value.data)
        if (m.status === 'fulfilled') setMatchups(m.value.data)
        if (b.status === 'fulfilled') setBets(b.value.data)
        if (t.status === 'fulfilled') setTournaments(t.value.data)
        if (sc.status === 'fulfilled') setMyScore(sc.value.data)
          // add this line:
        if (p.status === 'fulfilled') setUsername(p.value.data.username || null)
            
        setLoading(false)
    })
  }, [activeLeague, session])
  
  const label = (userId: string) => getTeamName(userId)

  const myMatchup = matchups.find(
    m => m.home_user_id === user?.id || m.away_user_id === user?.id
  )
  const myStanding = standings.find(s => s.user_id === user?.id)
  const recentBets = bets.slice(0, 3)
  const topStandings = standings.slice(0, 3)
  
  if (!activeLeague) return <p style={{ color: 'var(--text-dim)' }}>Select a league from the sidebar.</p>
  if (loading) return <p>Loading dashboard...</p>

  return (
    <div style={{ maxWidth: '900px', color: 'var(--text)' }}>
      <p style={{ color: 'var(--text-dim)', marginBottom: '4px', fontSize: '14px' }}>Hey there</p>
      <h1 style={{ marginBottom: '4px' }}>{username || user?.email}</h1>
      <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>{activeLeague.name}</p>


      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* My Score */}
        <div style={card}>
            <div style={ cardTitle }>Week {CURRENT_WEEK} Score</div>
            {myScore ? (
              <div style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text)'}}>
                {myScore.total_points.toFixed((1))} <span style={{ fontSize: '16px', color: 'var(--text-dim)' }}>pts</span>
              </div>
            ) : (
              <p style={{ color: 'var(--text-dim)' }}>No score yet</p>
            )}
            {myStanding && (
              <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px' }}>
                Record: {myStanding.wins}W - {myStanding.losses}L
              </p>
            )}
        </div>

          {/* Current Matchup */}
          <div style={card}>
            <div style={cardTitle}>This Week's Matchup</div>
            {myMatchup ? (
              <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: myMatchup.home_user_id === user?.id ? 'var(--accent)' : 'var(--text)' }}>
                      {label(myMatchup.home_user_id)}
                    </span>
                    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>vs</span>
                    <span style={{ color: myMatchup.away_user_id === user?.id ? 'var(--accent)' : 'var(--text)' }}>
                      {label(myMatchup.away_user_id)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}> 
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>{myMatchup.home_points.toFixed(1)}</span>
                      <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>{myMatchup.away_points.toFixed(1)}</span>
                  </div>
              </div>
            ) : (
                <p style={{ color: 'var(--text-dim)' }}>No matchup this week</p>
            )}
          </div>
          

                          {/* Standings */}
                          <div style={card}>
                    <div style={cardTitle}>Standings</div>
                    {topStandings.map((s, i) => (
                        <div key={s.user_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                            <span style={{ color: s.user_id === user?.id ? 'var(--accent)' : 'var(--text-muted)' }}>
                                {i + 1}. {label(s.user_id)}
                            </span>
                            <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>{s.wins}W {s.losses}L</span>
                        </div>
                    ))}
                    {standings.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No standings yet</p>}
                </div>

                {/* Recent Bets */}
                <div style={card}>
                    <div style={cardTitle}>Recent Bets</div>
                    {recentBets.length === 0 ? (
                        <p style={{ color: 'var(--text-dim)' }}>No bets yet</p>
                    ) : recentBets.map(bet => (
                        <div key={bet.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{bet.bet_type}</span>
                            <span style={{ color: bet.status === 'settled' ? 'var(--accent)' : 'var(--warning)', fontSize: '13px' }}>
                                ${(bet.amount / 100).toFixed(2)} · {bet.status}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Tournaments */}
                <div style={{ ...card, gridColumn: '1 / -1' }}>
                    <div style={cardTitle}>Tournaments</div>
                    {tournaments.length === 0 ? (
                        <p style={{ color: 'var(--text-dim)' }}>No tournaments yet</p>
                    ) : tournaments.map(t => (
                        <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                            <span style={{ color: 'var(--text)' }}>{t.name}</span>
                            <span style={{ color: t.status === 'active' ? 'var(--accent)' : 'var(--text-dim)', fontSize: '13px' }}>
                                {t.status} · {t.ai_brain}
                            </span>
                        </div>
                    ))}
                </div>

            </div>

    </div>
  )
}