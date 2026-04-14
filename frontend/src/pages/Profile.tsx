
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

interface Profile {
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
    favorite_team: string | null
    ai_brain: string
}

export default function Profile() {
    const { session } = useAuth()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [username, setUsername] = useState('')
    const [fullName, setFullName] = useState('')
    const [favoriteTeam, setFavoriteTeam] = useState('')
    const [aiBrain, setAiBrain] = useState('claude')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        if (!session) return

        axios
        .get(`${API_URL}/profile/`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
        })
        .then((res) => {
            const p = res.data
            setProfile(p)
            setUsername(p.username || '')
            setFullName(p.full_name || '')
            setFavoriteTeam(p.favorite_team || '')
            setAiBrain(p.ai_brain || 'claude')
        })
        .finally(() => setLoading(false))
    }, [session])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')

        try {
            const res = await axios.patch(
                `${API_URL}/profile/`,
                {
                    username,
                    full_name: fullName,
                    favorite_team: favoriteTeam,
                    ai_brain: aiBrain,
                },
                {
                    headers: { Authorization: `Bearer ${session?.access_token}` },
                }
            )
            setProfile(res.data)
            setMessage('Profile saved!')
        } catch {
            setMessage('Something went wrong. Try again.')
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <p>Loading profile....</p>
    if (!profile) return <p>Profile not found.</p>

    return (
        <div>
            <h1>Your Profile</h1>
            <form onSubmit={handleSave}>
                <div>
                    <label>Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                    />
                </div>
                <div>
                    <label>Favorite Team</label>
                    <input
                        type="text"
                        value={favoriteTeam}
                        onChange={(e) => setFavoriteTeam(e.target.value)}
                    />
                </div>
                <div>
                    <label>AI Brain</label>
                    <select value={aiBrain} onChange={(e) => setAiBrain(e.target.value)}>
                        <option value="claude">Claude</option>
                        <option value="openai">GPT-4 (OpenAI)</option>
                    </select>
                </div>
                {message && <p>{message}</p>}
                <button type="submit" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Profile'}
                </button>
            </form>
        </div>
    )
}