// ── IMPORTS ────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'
import { supabase } from '../lib/supabase'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL

const GIPHY_KEY = 'C0akdik55lotqYg8iWkJSbvUyCznltPb'

// ── INTERFACES / TYPES ─────────────────────────────────────────────────────────
interface Message {
    id: string
    user_id: string | null
    message: string | null
    is_bot: boolean
    bot_name: string | null
    bot_trigger: string | null
    created_at: string
}

interface GifResult {
    id: string
    url: string
    preview: string
}

interface GiphyApiGif {
    id: string
    images: {
        original: { url: string }
        fixed_height_small: { url: string }
    }
}

interface ActivityItem {
    id: string
    user_id: string
    team_name: string
    player_name: string
    player_position: string
    move_type: 'add' | 'drop'
    week: number
    created_at: string
}


export default function Chat() {
    // ── STATE ──────────────────────────────────────────────────────────────────
    const { user, session } = useAuth()
    const { activeLeague, getTeamName } = useLeague()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const [botLoading, setBotLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [gifOpen, setGifOpen] = useState(false)
    const [gifQuery, setGifQuery] = useState('')
    const [gifs, setGifs] = useState<GifResult[]>([])
    const [gifLoading, setGifLoading] = useState(false)
    const [tab, setTab] = useState<'chat' | 'activity'>('chat')
    const [activity, setActivity] = useState<ActivityItem[]>([])
    const [activityLoading, setActivityLoading] = useState(false)

    // ── EFFECTS / FETCH ON MOUNT / REALTIME SUBSCRIPTIONS ─────────────────────
    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}` }),
        [session?.access_token]
    )

    const fetchMessages = useCallback(() => {
        if (!activeLeague || !session) return
        axios.get<Message[]>(
            `${API_URL}/leagues/${activeLeague.id}/chat`,
            { headers }
        )
            .then(res => setMessages(res.data))
            .catch(() => {})
    }, [activeLeague, session, headers])

    const fetchActivity = useCallback(async () => {
        if (!activeLeague || !session) return
        setActivityLoading(true)
        try {
            const res = await axios.get<ActivityItem[]>(
                `${API_URL}/leagues/${activeLeague.id}/activity`,
                { headers }
            )
            setActivity(res.data)
        } catch {
            setActivity([])
        } finally {
            setActivityLoading(false)
        }
    }, [activeLeague, session, headers])

    useEffect(() => {
        if (tab === 'activity') fetchActivity()
    }, [tab, fetchActivity])


    useEffect(() => {
        fetchMessages()
        if (activeLeague && session) {
            axios.patch(
                `${API_URL}/leagues/${activeLeague.id}/chat/read`,
                {},
                { headers }
            ).catch(() => {})
        }
        const interval = setInterval(fetchMessages, 8000)
        return () => clearInterval(interval)
    }, [fetchMessages, activeLeague, session, headers])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // ── HANDLERS ───────────────────────────────────────────────────────────────
    const searchGifs = async (q: string) => {
        if (!q.trim()) return
        setGifLoading(true)
        try {
            const res = await fetch(
                `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=pg-13`
            )
            const data = await res.json()
            setGifs(
                (data.data ?? []).map((g: GiphyApiGif) => ({
                    id: g.id,
                    url: g.images.original.url,
                    preview: g.images.fixed_height_small.url,
                }))
            )
        } catch {
            setGifs([])
        } finally {
            setGifLoading(false)
        }
    }

    const sendGif = async (url: string) => {
        if (!activeLeague) return
        setGifOpen(false)
        setGifQuery('')
        setGifs([])
        try {
            await axios.post(
                `${API_URL}/leagues/${activeLeague.id}/chat`,
                { message: url },
                { headers }
            )
            fetchMessages()
        } catch {
            // silent — GIF failed to send
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !activeLeague) return
        setUploading(true)
        try {
            const path = `${activeLeague.id}/${Date.now()}-${file.name}`
            const { error } = await supabase.storage
                .from('chat-images')
                .upload(path, file)
            if (!error) {
                const { data } = supabase.storage
                    .from('chat-images')
                    .getPublicUrl(path)
                await axios.post(
                    `${API_URL}/leagues/${activeLeague.id}/chat`,
                    { message: data.publicUrl },
                    { headers }
                )
                fetchMessages()
            }
        } catch {
            // silent — upload failed
        } finally {
            e.target.value = ''
            setUploading(false)
        }
    }

    const triggerBot = async () => {
        if (!activeLeague) return
        setBotLoading(true)
        try {
            await axios.post(
                `${API_URL}/leagues/${activeLeague.id}/chat/bot`,
                { trigger: 'manual', context: 'League members requested a bot update.' },
                { headers }
            )
            fetchMessages()
        } catch {
            // silent
        } finally {
            setBotLoading(false)
        }
    }

    const sendMessage = async () => {
        if (sending || !input.trim() || !activeLeague) return
        setSending(true)
        try {
            await axios.post(
                `${API_URL}/leagues/${activeLeague.id}/chat`,
                { message: input },
                { headers }
            )
            setInput('')
            fetchMessages()
        } catch {
            // silent
        } finally {
            setSending(false)
        }
    }

    const handleDelete = async (messageId: string) => {
        if (!activeLeague) return
        try {
            await axios.delete(
                `${API_URL}/leagues/${activeLeague.id}/chat/${messageId}`,
                { headers }
            )
            setMessages(prev => prev.filter(m => m.id !== messageId))
        } catch {
            // silent
        }
    }
    

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    // ── HELPERS ────────────────────────────────────────────────────────────────
    const isImage = (msg: string) =>
        !!msg && (
            /\.(gif|png|jpe?g|webp)$/i.test(msg) ||
            msg.includes('giphy.com') ||
            (msg.includes('supabase') && msg.includes('chat-images'))
        )

    const label = (msg: Message) => {
        if (msg.is_bot) return msg.bot_name || 'Commissioner Bot'
        if (msg.user_id === user?.id) return 'You'
        return getTeamName(msg.user_id ?? null)
    }

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (!activeLeague) return <p style={{ color: 'var(--text-dim)' }}>Select a league from the sidebar.</p>

    // ── JSX ────────────────────────────────────────────────────────────────────
    return (
        <div style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
            <h1 style={{ marginBottom: '4px' }}>League Chat</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '8px' }}>{activeLeague.name}</p>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '12px' }}>
                {(['chat', 'activity'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                            color: tab === t ? 'var(--accent)' : 'var(--text-dim)',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            fontWeight: tab === t ? 'bold' : 'normal',
                            fontSize: '13px',
                            marginBottom: '-1px',
                        }}
                    >
                        {t === 'chat' ? 'Chat' : 'Activity'}
                    </button>
                ))}
            </div>

            {/* ── GIF Picker Overlay ── */}
            {tab === 'chat' && gifOpen && (
                <div style={{
                    position: 'fixed',
                    bottom: '100px',
                    left: '260px',
                    width: '420px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '12px',
                    zIndex: 100,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                        <input
                            autoFocus
                            value={gifQuery}
                            onChange={e => setGifQuery(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') searchGifs(gifQuery) }}
                            placeholder="Search GIFs..."
                            style={{
                                flex: 1,
                                backgroundColor: 'var(--bg-input)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                padding: '8px 12px',
                                color: 'var(--text)',
                                fontSize: '13px',
                                outline: 'none',
                            }}
                        />
                        <button
                            onClick={() => searchGifs(gifQuery)}
                            style={{
                                backgroundColor: 'var(--accent-sec)',
                                color: 'var(--btn-text)',
                                border: 'none',
                                borderRadius: 'var(--radius)',
                                padding: '8px 14px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontSize: '13px',
                            }}
                        >
                            Search
                        </button>
                        <button
                            onClick={() => { setGifOpen(false); setGifQuery(''); setGifs([]) }}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-dim)',
                                cursor: 'pointer',
                                fontSize: '18px',
                            }}
                        >
                            ✕
                        </button>
                    </div>
                    {gifLoading && <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Searching...</p>}
                    {/* ── GIF Grid ── */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '6px',
                        maxHeight: '260px',
                        overflowY: 'auto',
                    }}>
                        {gifs.map(g => (
                            <img
                                key={g.id}
                                src={g.preview}
                                alt="GIF option"
                                onClick={() => sendGif(g.url)}
                                style={{
                                    width: '100%',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    border: '2px solid transparent',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Chat Tab ── */}
            {tab === 'chat' && (
                <>
                    {/* ── Message List ── */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '16px',
                        marginBottom: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                    }}>
                        {messages.length === 0 && (
                            <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: '40px' }}>
                                No messages yet. Say something.
                            </p>
                        )}
                        {messages.map(msg => (
                            <div
                                key={msg.id}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: msg.user_id === user?.id && !msg.is_bot ? 'flex-end' : 'flex-start',
                                }}
                            >
                                {/* ── Message Label Row ── */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                    <span style={{
                                        fontSize: '11px',
                                        color: msg.is_bot ? 'var(--warning)' : 'var(--text-dim)',
                                    }}>
                                        {label(msg)} · {formatTime(msg.created_at)}
                                    </span>
                                    {msg.user_id === user?.id && !msg.is_bot && (
                                        <button
                                            onClick={() => handleDelete(msg.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--text-dim)',
                                                cursor: 'pointer',
                                                fontSize: '11px',
                                                padding: '0',
                                                opacity: 0.5,
                                            }}
                                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                                            onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                                {/* ── Message Bubble ── */}
                                {isImage(msg.message ?? '') ? (
                                    <img
                                        src={msg.message ?? ''}
                                        alt="Chat image"
                                        style={{
                                            maxWidth: '240px',
                                            borderRadius: 'var(--radius)',
                                            border: '1px solid var(--border)',
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        backgroundColor: msg.is_bot ? '#1f1800' : msg.user_id === user?.id ? 'var(--accent-dark)' : 'var(--bg-deep)',
                                        border: `1px solid ${msg.is_bot ? 'var(--warning)' : msg.user_id === user?.id ? 'var(--accent)' : 'var(--border)'}`,
                                        borderRadius: 'var(--radius)',
                                        padding: '10px 14px',
                                        maxWidth: '80%',
                                        color: msg.is_bot ? '#ffcc44' : 'var(--text)',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                    }}>
                                        {msg.message ?? ''}
                                    </div>
                                )}
                            </div>
                        ))}

                        <div ref={bottomRef} />
                    </div>

                    {/* ── Input Row ── */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {/* ── GIF Button ── */}
                        <button
                            onClick={() => setGifOpen(o => !o)}
                            style={{
                                backgroundColor: gifOpen ? 'var(--accent-dark)' : 'transparent',
                                color: gifOpen ? 'var(--accent)' : 'var(--text-dim)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                padding: '10px 14px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '13px',
                            }}
                        >
                            GIF
                        </button>
                        {/* ── Image Upload Button ── */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            style={{
                                backgroundColor: 'transparent',
                                color: 'var(--text-dim)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                padding: '10px 14px',
                                cursor: uploading ? 'not-allowed' : 'pointer',
                                fontSize: '16px',
                            }}
                        >
                            {uploading ? '⏳' : '📎'}
                        </button>
                        {/* ── Text Input ── */}
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Say something... (Enter to send)"
                            style={{
                                flex: 1,
                                backgroundColor: 'var(--bg-input)',
                                border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)',
                                padding: '10px 14px',
                                color: 'var(--text)',
                                fontSize: '14px',
                                outline: 'none',
                            }}
                        />
                        {/* ── Send Button ── */}
                        <button
                            onClick={sendMessage}
                            disabled={sending || !input.trim()}
                            style={{
                                backgroundColor: sending || !input.trim() ? 'var(--border)' : 'var(--accent)',
                                color: sending || !input.trim() ? 'var(--text-dim)' : '#000',
                                border: 'none',
                                borderRadius: 'var(--radius)',
                                padding: '10px 20px',
                                cursor: sending || !input.trim() ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px',
                            }}
                        >
                            Send
                        </button>
                        {/* ── Ask Bot Button ── */}
                        <button
                            onClick={triggerBot}
                            disabled={botLoading}
                            style={{
                                backgroundColor: 'transparent',
                                color: botLoading ? 'var(--text-dim)' : 'var(--warning)',
                                border: '1px solid var(--warning)',
                                borderRadius: 'var(--radius)',
                                padding: '10px 16px',
                                cursor: botLoading ? 'not-allowed' : 'pointer',
                                fontWeight: 'bold',
                                fontSize: '14px',
                            }}
                        >
                            {botLoading ? '...' : 'Ask Bot'}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageUpload}
                        />
                    </div>
                </>
            )}

            {/* ── Activity Tab ── */}
            {tab === 'activity' && (
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '16px',
                }}>
                    {activityLoading && (
                        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: '40px' }}>
                            Loading activity...
                        </p>
                    )}
                    {!activityLoading && activity.length === 0 && (
                        <p style={{ color: 'var(--text-dim)', textAlign: 'center', marginTop: '40px' }}>
                            No roster moves yet.
                        </p>
                    )}
                    {/* ── Activity List ── */}
                    {activity.map(item => (
                        <div
                            key={item.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 0',
                                borderBottom: '1px solid var(--border-subtle)',
                            }}
                        >
                            <div>
                                <span style={{
                                    color: item.move_type === 'add' ? 'var(--accent)' : 'var(--danger)',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    marginRight: '8px',
                                }}>
                                    {item.move_type === 'add' ? '+ ADD' : '− DROP'}
                                </span>
                                <span style={{ color: 'var(--text)', fontSize: '14px' }}>
                                    {item.player_name}
                                </span>
                                <span style={{ color: 'var(--text-dim)', fontSize: '12px', marginLeft: '8px' }}>
                                    {item.player_position}
                                </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                    {item.team_name}
                                </div>
                                <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '2px' }}>
                                    Wk {item.week} · {formatTime(item.created_at)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────
// default export is declared on the function above
