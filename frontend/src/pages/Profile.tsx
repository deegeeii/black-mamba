
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

const NFL_TEAMS = [
    'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
    'DAL','DEN','DET','GB','HOU','IND','JAX','KC',
    'LAC','LAR','LV','MIA','MIN','NE','NO','NYG',
    'NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'
]

interface Profile {
    id: string
    username: string
    full_name: string | null
    favorite_team: string | null
    team_name: string | null
    podcast_1: string | null
    podcast_2: string | null
    podcast_3: string | null
    ai_brain: string
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '10px',
    color: '#fff',
    fontSize: '14px',
    marginTop: '6px',
}

const labelStyle: React.CSSProperties = {
    color: '#666',
    fontSize: '12px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
}

const sectionStyle: React.CSSProperties = {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '16px',
}

export default function Profile() {
    const { session } = useAuth()
    const [username, setUsername] = useState('')
    const [fullName, setFullName] = useState('')
    const [teamName, setTeamName] = useState('')
    const [favoriteTeam, setFavoriteTeam] = useState('')
    const [podcast1, setPodcast1] = useState('')
    const [podcast2, setPodcast2] = useState('')
    const [podcast3, setPodcast3] = useState('')
    const [aiBrain, setAiBrain] = useState('claude')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}` }),
        [session?.access_token]
    )

    useEffect(() => {
        if (!session) return
        axios.get(`${API_URL}/profile/`, { headers }).then(res => {
            const p: Profile = res.data
            setUsername(p.username || '')
            setFullName(p.full_name || '')
            setTeamName(p.team_name || '')
            setFavoriteTeam(p.favorite_team || '')
            setPodcast1(p.podcast_1 || '')
            setPodcast2(p.podcast_2 || '')
            setPodcast3(p.podcast_3 || '')
            setAiBrain(p.ai_brain || 'claude')
        }).finally(() => setLoading(false))
    }, [session])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')
        try {
            await axios.patch(`${API_URL}/profile/`, {
                username,
                full_name: fullName,
                team_name: teamName,
                favorite_team: favoriteTeam,
                podcast_1: podcast1,
                podcast_2: podcast2,
                podcast_3: podcast3,
                ai_brain: aiBrain,
            }, { headers })
            setMessage('Profile saved!')
        } catch {
            setMessage('Something went wrong.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <p>Loading profile...</p>

    return (
        <div style={{ maxWidth: '600px' }}>
            <h1 style={{ marginBottom: '4px' }}>Profile Settings</h1>
            <p style={{ color: '#666', marginBottom: '24px' }}>Manage your account and preferences</p>

            <form onSubmit={handleSave}>

                <div style={sectionStyle}>
                    <h3 style={{ color: '#00ff88', marginBottom: '16px' }}>Identity</h3>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelStyle}>Username</label>
                        <input style={inputStyle} value={username} onChange={e => setUsername(e.target.value)} required />
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <label style={labelStyle}>Full Name</label>
                        <input style={inputStyle} value={fullName} onChange={e => setFullName(e.target.value)} />
                    </div>
                    <div>
                        <label style={labelStyle}>Team Name</label>
                        <input style={inputStyle} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Mambas" />
                    </div>
                </div>

                <div style={sectionStyle}>
                    <h3 style={{ color: '#00ff88', marginBottom: '16px' }}>NFL Allegiance</h3>
                    <div>
                        <label style={labelStyle}>Favorite NFL Team</label>
                        <select style={inputStyle} value={favoriteTeam} onChange={e => setFavoriteTeam(e.target.value)}>
                            <option value="">— Select a team —</option>
                            {NFL_TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div style={sectionStyle}>
                    <h3 style={{ color: '#00ff88', marginBottom: '16px' }}>Top 3 Podcasts</h3>
                    {[
                        { label: 'Podcast #1', value: podcast1, set: setPodcast1 },
                        { label: 'Podcast #2', value: podcast2, set: setPodcast2 },
                        { label: 'Podcast #3', value: podcast3, set: setPodcast3 },
                    ].map(({ label, value, set }) => (
                        <div key={label} style={{ marginBottom: '12px' }}>
                            <label style={labelStyle}>{label}</label>
                            <input style={inputStyle} value={value} onChange={e => set(e.target.value)} placeholder="Podcast name" />
                        </div>
                    ))}
                </div>

                <div style={sectionStyle}>
                    <h3 style={{ color: '#00ff88', marginBottom: '16px' }}>AI Preference</h3>
                    <div>
                        <label style={labelStyle}>Personal AI Assistant</label>
                        <select style={inputStyle} value={aiBrain} onChange={e => setAiBrain(e.target.value)}>
                            <option value="claude">Claude (Anthropic)</option>
                            <option value="gpt4">GPT-4 (OpenAI)</option>
                            <option value="none">None</option>
                        </select>
                    </div>
                </div>

                {message && (
                    <p style={{ color: message.includes('saved') ? '#00ff88' : '#ff4444', marginBottom: '12px' }}>
                        {message}
                    </p>
                )}
                <button
                    type="submit"
                    disabled={saving}
                    style={{ backgroundColor: '#00ff88', color: '#000', border: 'none', borderRadius: '6px', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
                >
                    {saving ? 'Saving...' : 'Save Profile'}
                </button>
            </form>
        </div>
    )
}
