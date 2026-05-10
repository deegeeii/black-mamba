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
        <div>
          <h1>Week {CURRENT_WEEK} Matchups</h1>
    
          {matchups.length === 0 ? (
            <p>No matchups generated yet.</p>
          ) : (
            matchups.map((m) => (
              <div key={m.id} style={{ border: '1px solid #ccc', padding: '8px', margin: '8px 0' }}>
                <span style={{ fontWeight: m.winner_user_id === m.home_user_id ? 'bold' : 'normal' }}>
                  {label(m.home_user_id)} ({m.home_points} pts)
                </span>
                {' vs '}
                <span style={{ fontWeight: m.winner_user_id === m.away_user_id ? 'bold' : 'normal' }}>
                  {label(m.away_user_id)} ({m.away_points} pts)
                </span>
              </div>
            ))
          )}
    
          <h2>Standings</h2>
          <table>
            <thead>
              <tr>
                <th>Team</th>
                <th>W</th>
                <th>L</th>
                <th>PF</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s) => (
                <tr key={s.user_id}>
                  <td>{label(s.user_id)}</td>
                  <td>{s.wins}</td>
                  <td>{s.losses}</td>
                  <td>{s.points_for}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )    
}