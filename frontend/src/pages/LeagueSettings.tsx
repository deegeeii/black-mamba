import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export default function LeagueSettings() {
    const { leagueId } = useParams<{ leagueId: string }>()
    const { session } = useAuth()
    const [teamName, setTeamName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    const headers = useMemo(() => ({ Authorization: `Bearer ${session?.access_token}` }), [session?.access_token])

    useEffect(() => {
        if (!session) return
        Promise.allSettled([
            axios.get(`${API_URL}/leagues/${leagueId}/members`, { headers }),
            axios.get(`${API_URL}/profile/`, { headers }),
        ]).then(([membersRes, profileRes]) => {
            if (membersRes.status === 'fulfilled') {
                const me = membersRes.value.data.find((m: any) => m.user_id === session.user.id)
                if (me?.team_name) setTeamName(me.team_name)
            }
            if (profileRes.status === 'fulfilled') {
                setAvatarUrl(profileRes.value.data.avatar_url || '')
            }
            setLoading(false)
        })
    }, [session])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')
        try {
            await axios.patch(`${API_URL}/leagues/${leagueId}/my-team`, {
                team_name: teamName,
                avatar_url: avatarUrl,
            }, { headers })
            setMessage('Saved!')
        } catch {
            setMessage('Something went wrong.')
        } finally {
            setSaving(false)
        }
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        backgroundColor: 'var(--bg-input)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '10px',
        color: 'var(--text)',
        fontSize: '14px',
        marginTop: '6px',
        boxSizing: 'border-box',
    }

    const labelStyle: React.CSSProperties = {
        color: 'var(--text-dim)',
        fontSize: '12px',
        letterSpacing: '1px',
        textTransform: 'uppercase',
    }

    if (loading) return <p>Loading...</p>

    return (
        <div style={{ maxWidth: '500px' }}>
            <h1 style={{ marginBottom: '4px' }}>Team Settings</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '24px' }}>Customize how you appear in this league</p>

            <form onSubmit={handleSave}>
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '16px' }}>
                    <h3 style={{ color: 'var(--accent)', marginBottom: '16px' }}>Team Identity</h3>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Team Name</label>
                        <input style={inputStyle} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Mambas" />
                    </div>

                    <div style={{ marginBottom: '8px' }}>
                        <label style={labelStyle}>Avatar URL</label>
                        <input style={inputStyle} value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
                    </div>

                    {avatarUrl && (
                        <img src={avatarUrl} alt="Avatar preview" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', marginTop: '12px', border: '2px solid var(--border)' }} />
                    )}
                </div>

                {message && (
                    <p style={{ color: message === 'Saved!' ? 'var(--accent)' : 'var(--danger)', marginBottom: '12px' }}>{message}</p>
                )}

                <button type="submit" disabled={saving} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                    {saving ? 'Saving...' : 'Save Team Settings'}
                </button>
            </form>
        </div>
    )
}
