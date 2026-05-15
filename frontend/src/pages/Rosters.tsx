import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

interface Player {
    player_id: string
    name: string
    position: string
    nfl_team: string | null
}

interface MemberRoster {
    user_id: string
    team_name: string
    avatar_url: string | null
    roster: Player[]
}

const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE']

export default function Rosters() {
    const { leagueId } = useParams<{ leagueId: string }>()
    const { session } = useAuth()
    const [rosters, setRosters] = useState<MemberRoster[]>([])
    const [expanded, setExpanded] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const headers = useMemo(() => ({ Authorization: `Bearer ${session?.access_token}` }), [session?.access_token])

    useEffect(() => {
        if (!session) return
        axios.get(`${API_URL}/leagues/${leagueId}/rosters`, { headers })
            .then(res => { setRosters(res.data); setLoading(false) })
            .catch(() => setLoading(false))
    }, [session])

    const sortedRoster = (players: Player[]) => {
        return [...players].sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))
    }

    if (loading) return <p>Loading rosters...</p>

    return (
        <div style={{ maxWidth: '700px' }}>
            <h1 style={{ marginBottom: '4px' }}>Rosters</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>All league member rosters</p>

            {rosters.map(member => (
                <div key={member.user_id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '12px', overflow: 'hidden' }}>
                    <div
                        style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', justifyContent: 'space-between' }}
                        onClick={() => setExpanded(expanded === member.user_id ? null : member.user_id)}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {member.avatar_url ? (
                                <img src={member.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 'bold', fontSize: '14px' }}>
                                    {member.team_name.charAt(0)}
                                </div>
                            )}
                            <div>
                                <div style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '15px' }}>{member.team_name}</div>
                                <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{member.roster.length} players</div>
                            </div>
                        </div>
                        <span style={{ color: 'var(--text-dim)', fontSize: '18px' }}>{expanded === member.user_id ? '▲' : '▼'}</span>
                    </div>

                    {expanded === member.user_id && (
                        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 20px' }}>
                            {POSITION_ORDER.map(pos => {
                                const players = sortedRoster(member.roster).filter(p => p.position === pos)
                                if (players.length === 0) return null
                                return (
                                    <div key={pos} style={{ marginBottom: '12px' }}>
                                        <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{pos}</div>
                                        {players.map(p => (
                                            <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '14px' }}>
                                                <span style={{ color: 'var(--text)' }}>{p.name}</span>
                                                <span style={{ color: 'var(--text-dim)' }}>{p.nfl_team || '—'}</span>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
