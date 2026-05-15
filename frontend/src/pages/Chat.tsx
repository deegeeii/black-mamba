import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL


interface Message {
    id: string
    user_id: string | null
    message: string
    is_bot: boolean
    bot_trigger: string | null
    created_at: string
}


export default function Chat() {
    const { user, session } = useAuth()
    const { activeLeague, getTeamName } = useLeague()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}` }),
        [session?.access_token]
    )

    const fetchMessages = () => {
        if (!activeLeague || !session) return
        axios.get(`${API_URL}/leagues/${activeLeague.id}/chat`, { headers })
            .then(res => setMessages(res.data))
            .catch(() => {})
    }

    useEffect(() => {
        fetchMessages()
        const interval = setInterval(fetchMessages, 8000)
        return () => clearInterval(interval)
      }, [activeLeague, session])
    

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || !activeLeague) return
        setSending(true)
        await axios.post(
            `${API_URL}/leagues/${activeLeague.id}/chat`,
            { message: input },
            { headers }
        )
        setInput('')
        fetchMessages()
        setSending(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const label = (msg: Message) => {
        if (msg.is_bot) return 'Commissioner Bot'
        if (msg.user_id === user?.id) return 'You'
        return getTeamName(msg.user_id ?? null)
    }

    const formatTime = (iso: string) =>
        new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    if (!activeLeague) return <p style={{ color: 'var(--text-dim)' }}>Select a league from the sidebar.</p>

    return (
        <div style={{ maxWidth: '700px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 48px)' }}>
            <h1 style={{ marginBottom: '4px' }}>League Chat</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '16px' }}>{activeLeague.name}</p>
    
            {/* Message List */}
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
                gap: '12px'
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
                            alignItems: msg.user_id === user?.id && !msg.is_bot ? 'flex-end' : 'flex-start'
                        }}
                    >
                        <span style={{ fontSize: '11px', color: msg.is_bot ? 'var(--warning)' : 'var(--text-dim)', marginBottom: '4px' }}>
                            {label(msg)} · {formatTime(msg.created_at)}
                        </span>
                        <div style={{
                            backgroundColor: msg.is_bot ? '#1f1800' : msg.user_id === user?.id ? 'var(--accent-dark)' : 'var(--bg-deep)',
                            border: `1px solid ${msg.is_bot ? 'var(--warning)' : msg.user_id === user?.id ? 'var(--accent)' : 'var(--border)'}`,
                            borderRadius: 'var(--radius)',
                            padding: '10px 14px',
                            maxWidth: '80%',
                            color: msg.is_bot ? '#ffcc44' : 'var(--text)',
                            fontSize: '14px',
                            lineHeight: '1.5'
                        }}>
                            {msg.message}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
    
            {/* Input */}
            <div style={{ display: 'flex', gap: '8px' }}>
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
                        outline: 'none'
                    }}
                />
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
                        fontSize: '14px'
                    }}
                >
                    Send
                </button>
            </div>
        </div>
    )
    
}