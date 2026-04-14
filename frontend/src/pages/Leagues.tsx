
import { useState, useEffect } from "react";
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

interface League {
    id: string
    name: string
    commissioner_id: string
    scoring_type: string
    max_teams: number
    invite_code: string
    created_at: string
}

export default function Leagues() {
    const { session } = useAuth()
    const [leagues, setLeagues] = useState<League[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [showJoin, setShowJoin] = useState(false)

    // Create form state
    const [name, setName] = useState('')
    const [scoringType, setScoringType] = useState('standard')
    const [maxTeams, setMaxTeams] = useState(12)
    const [teamName, setTeamName] = useState('')
    
    // Join form status
    const [inviteCode, setInviteCode] = useState('')
    const [joinTeamName, setJoinTeamName] = useState('')
    
    const [error, setError] = useState('')

    const headers = { Authorization: `Bearer ${session?.access_token}` }

    useEffect(() => {
        axios
            .get(`${API_URL}/leagues/`, { headers })
            .then((res) => setLeagues(res.data))
            .finally(() => setLoading(false))
    }, [])
    
    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        try {
            const res = await axios.post(
                `${API_URL}/leagues/`,
                { name, scoring_type: scoringType, max_teams: maxTeams, team_name: teamName },
                { headers }
            )
            setLeagues([...leagues, res.data])
            setShowCreate(false)
            setName('')
            setTeamName('')
        } catch {
            setError('Failed to create league.')
        }
    }

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        try {
          const res = await axios.post(
            `${API_URL}/leagues/join`,
            { invite_code: inviteCode, team_name: joinTeamName },
            { headers }
          )
          setLeagues([...leagues, res.data])
          setShowJoin(false)
          setInviteCode('')
          setJoinTeamName('')
        } catch {
          setError('Invalid invite code or already a member.')
        }
      }
    
      if (loading) return <p>Loading leagues...</p>
            
    return (
        <div>
            <h1>My Leagues</h1>

            <button onClick={() => { setShowCreate(true); setShowJoin(false) }}>
                Create League
            </button>
            <button onClick={() => {setShowJoin(true); setShowCreate(false)} }>
                Join League
            </button>

            {error && <p style={{ color: 'red' }}>{error}</p>}

            {showCreate && (
        <form onSubmit={handleCreate}>
          <h2>Create a League</h2>
          <div>
            <label>League Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label>Your Team Name</label>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
          </div>
          <div>
            <label>Scoring Type</label>
            <select value={scoringType} onChange={(e) => setScoringType(e.target.value)}>
              <option value="standard">Standard (ESPN)</option>
              <option value="standard_plus">Standard+</option>
              <option value="dynasty">Dynasty</option>
            </select>
          </div>
          <div>
            <label>Max Teams</label>
            <input
              type="number"
              value={maxTeams}
              onChange={(e) => setMaxTeams(Number(e.target.value))}
              min={2}
              max={20}
            />
          </div>
          <button type="submit">Create</button>
          <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
        </form>
      )}

      {showJoin && (
        <form onSubmit={handleJoin}>
          <h2>Join a League</h2>
          <div>
            <label>Invite Code</label>
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} required />
          </div>
          <div>
            <label>Your Team Name</label>
            <input value={joinTeamName} onChange={(e) => setJoinTeamName(e.target.value)} required />
          </div>
          <button type="submit">Join</button>
          <button type="button" onClick={() => setShowJoin(false)}>Cancel</button>
        </form>
      )}

      {leagues.length === 0 ? (
        <p>You're not in any leagues yet.</p>
      ) : (
        leagues.map((league) => (
          <div key={league.id}>
            <h3>{league.name}</h3>
            <p>Scoring: {league.scoring_type}</p>
            <p>Max Teams: {league.max_teams}</p>
            <p>Invite Code: <strong>{league.invite_code}</strong></p>
          </div>
        ))
      )}
    </div>
  )
}
