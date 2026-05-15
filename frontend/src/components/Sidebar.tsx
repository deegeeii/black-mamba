import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useLeague } from '../contexts/LeagueContext'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL

const NAV_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'My Team', path: '/team' },
    { label: 'Matchups', path: '/matchups' },
    { label: 'Bets', path: '/bets' },
    { label: 'Arena', path: '/tournaments' },
    { label: 'Chat', path: '/chat' },
    { label: 'Ledger', path: '/ledger' },
]

const BOTTOM_ITEMS = [
    { label: 'Profile', path: '/profile' },
]

type Notification = {
    id: string
    type: string
    message: string
    read: boolean
    created_at: string
}

const styles: Record<string, React.CSSProperties> = {
    sidebar: {
        width: '220px',
        height: '100vh',
        backgroundColor: 'var(--bg-deep)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
    },
    wordmark: {
        color: 'var(--accent)',
        fontSize: '22px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        padding: '0 24px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bellBtn: {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        position: 'relative' as const,
        padding: '0',
        color: 'var(--text-dim)',
        display: 'flex',
        alignItems: 'center',
    },
    badge: {
        position: 'absolute' as const,
        top: '-6px',
        right: '-6px',
        backgroundColor: 'var(--danger)',
        color: '#fff',
        fontSize: '10px',
        fontWeight: 'bold',
        borderRadius: '999px',
        minWidth: '16px',
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 3px',
    },
    dropdown: {
        position: 'fixed' as const,
        top: '60px',
        left: '220px',
        width: '300px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        zIndex: 1000,
        maxHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
    },
    dropdownHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        color: 'var(--text)',
        fontSize: '13px',
        fontWeight: 'bold',
    },
    markAllBtn: {
        background: 'none',
        border: 'none',
        color: 'var(--accent)',
        fontSize: '12px',
        cursor: 'pointer',
    },
    notifList: {
        overflowY: 'auto' as const,
        flex: 1,
    },
    notifItem: {
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-subtle)',
        cursor: 'pointer',
    },
    notifMessage: {
        fontSize: '13px',
        color: 'var(--text)',
        marginBottom: '4px',
    },
    notifTime: {
        fontSize: '11px',
        color: 'var(--text-dim)',
    },
    empty: {
        padding: '24px 16px',
        textAlign: 'center' as const,
        color: 'var(--text-dim)',
        fontSize: '13px',
    },
    leagueSection: {
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-subtle)',
    },
    leagueLabel: {
        color: 'var(--text-dim)',
        fontSize: '11px',
        letterSpacing: '1px',
        textTransform: 'uppercase' as const,
        marginBottom: '8px',
    },
    select: {
        width: '100%',
        backgroundColor: 'var(--bg-card)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '8px',
        fontSize: '13px',
    },
    nav: {
        flex: 1,
        padding: '16px 0',
        overflowY: 'auto' as const,
    },
    navItem: {
        display: 'block',
        padding: '12px 24px',
        color: 'var(--text-dim)',
        textDecoration: 'none',
        fontSize: '14px',
        cursor: 'pointer',
        borderLeft: '3px solid transparent',
        transition: 'all 0.15s',
    },
    navItemActive: {
        color: 'var(--accent)',
        borderLeft: '3px solid var(--accent)',
        backgroundColor: 'var(--accent-dark)',
    },
    navGroupLabel: {
        padding: '16px 24px 6px',
        color: 'var(--text-dim)',
        fontSize: '11px',
        letterSpacing: '1px',
        textTransform: 'uppercase' as const,
    },
    navSubItem: {
        display: 'block',
        padding: '10px 24px 10px 32px',
        color: 'var(--text-dim)',
        fontSize: '13px',
        cursor: 'pointer',
        borderLeft: '3px solid transparent',
        transition: 'all 0.15s',
    },
    signOut: {
        padding: '16px 24px',
        borderTop: '1px solid var(--border-subtle)',
        color: 'var(--text-dim)',
        fontSize: '13px',
        cursor: 'pointer',
    },
}

export default function Sidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const { leagues, activeLeague, setActiveLeague } = useLeague()
    const { session, signOut } = useAuth()

    const [notifications, setNotifications] = useState<Notification[]>([])
    const [bellOpen, setBellOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    const headers = useMemo(() => ({
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
    }), [session?.access_token])

    const unreadCount = notifications.filter(n => !n.read).length

    useEffect(() => {
        if (!activeLeague || !session) return
        fetch(`${API_URL}/leagues/${activeLeague.id}/notifications`, { headers })
            .then(r => r.json())
            .then(data => setNotifications(Array.isArray(data) ? data : []))
    }, [activeLeague?.id, session])

    useEffect(() => {
        if (!activeLeague || !session) return
        const channel = supabase
            .channel(`notifications:${activeLeague.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${session.user.id}`,
            }, (payload) => {
                setNotifications(prev => [payload.new as Notification, ...prev])
                const btn = document.querySelector('.bell-btn')
                if (btn) {
                    btn.classList.add('scroll-pop')
                    setTimeout(() => btn.classList.remove('scroll-pop'), 500)
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [activeLeague?.id, session?.user.id])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setBellOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const markAllRead = async () => {
        if (!activeLeague) return
        await fetch(`${API_URL}/leagues/${activeLeague.id}/notifications/read-all`, { method: 'PATCH', headers })
        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }

    const markRead = async (id: string) => {
        if (!activeLeague) return
        await fetch(`${API_URL}/leagues/${activeLeague.id}/notifications/read`, {
            method: 'PATCH', headers,
            body: JSON.stringify({ notification_ids: [id] }),
        })
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    }

    const formatTime = (ts: string) => {
        const d = new Date(ts)
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    }

    const GLOBAL_ROUTES = ['/dashboard', '/profile', '/ledger']

    const handleNav = (path: string) => {
        if (GLOBAL_ROUTES.includes(path)) { navigate(path); return }
        if (!activeLeague) return
        navigate(`/leagues/${activeLeague.id}${path}`)
    }

    const isActive = (path: string) => {
        if (GLOBAL_ROUTES.includes(path)) return location.pathname === path
        return location.pathname.includes(path)
    }

    return (
        <div style={styles.sidebar}>
            <style>{`
                .scroll-icon { transition: transform 0.2s ease, color 0.2s ease; }
                .bell-btn:hover .scroll-icon { transform: scale(1.2) rotate(-8deg); color: var(--accent); }
                .scroll-unread .scroll-icon { color: var(--accent); animation: scrollGlow 2.5s ease-in-out infinite; }
                @keyframes scrollGlow {
                    0%, 100% { filter: drop-shadow(0 0 2px var(--accent)); }
                    50% { filter: drop-shadow(0 0 7px var(--accent)); opacity: 0.8; }
                }
                @keyframes scrollPop {
                    0%   { transform: scaleY(1) rotate(0deg); }
                    25%  { transform: scaleY(0.8) rotate(-6deg); }
                    60%  { transform: scaleY(1.15) rotate(3deg); }
                    100% { transform: scaleY(1) rotate(0deg); }
                }
                .scroll-pop .scroll-icon { animation: scrollPop 0.5s ease forwards !important; }
            `}</style>

            <div style={styles.wordmark}>
                BLACK MAMBA
                <button className={`bell-btn ${unreadCount > 0 ? 'scroll-unread' : ''}`} style={styles.bellBtn} onClick={() => setBellOpen(o => !o)}>
                    <svg className="scroll-icon" width="18" height="20" viewBox="0 0 18 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <ellipse cx="9" cy="3.5" rx="7" ry="2.5"/>
                        <line x1="2" y1="3.5" x2="2" y2="16.5"/>
                        <line x1="16" y1="3.5" x2="16" y2="16.5"/>
                        <ellipse cx="9" cy="16.5" rx="7" ry="2.5"/>
                        <line x1="5.5" y1="8" x2="12.5" y2="8" strokeWidth="1"/>
                        <line x1="5.5" y1="11" x2="12.5" y2="11" strokeWidth="1"/>
                        <line x1="5.5" y1="14" x2="10" y2="14" strokeWidth="1"/>
                    </svg>
                    {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
            </div>

            {bellOpen && (
                <div style={styles.dropdown} ref={dropdownRef}>
                    <div style={styles.dropdownHeader}>
                        Notifications
                        {unreadCount > 0 && <button style={styles.markAllBtn} onClick={markAllRead}>Mark all read</button>}
                    </div>
                    <div style={styles.notifList}>
                        {notifications.length === 0 ? (
                            <div style={styles.empty}>No notifications</div>
                        ) : notifications.map(n => (
                            <div key={n.id} style={{ ...styles.notifItem, backgroundColor: n.read ? 'transparent' : 'var(--accent-dark)' }} onClick={() => markRead(n.id)}>
                                <div style={styles.notifMessage}>{n.message}</div>
                                <div style={styles.notifTime}>{formatTime(n.created_at)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={styles.leagueSection}>
                <div style={styles.leagueLabel}>League</div>
                <select style={styles.select} value={activeLeague?.id || ''} onChange={e => {
                    const league = leagues.find(l => l.id === e.target.value)
                    if (league) setActiveLeague(league)
                }}>
                    {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
            </div>

            <nav style={styles.nav}>
                {NAV_ITEMS.map(item => (
                    <div key={item.path} style={{ ...styles.navItem, ...(isActive(item.path) ? styles.navItemActive : {}) }} onClick={() => handleNav(item.path)}>
                        {item.label}
                    </div>
                ))}

            <div key="/league-home" style={{ ...styles.navItem, ...(isActive('/league-home') ? styles.navItemActive : {}) }} onClick={() => handleNav('/league-home')}>
                League
            </div>



                {BOTTOM_ITEMS.map(item => (
                    <div key={item.path} style={{ ...styles.navItem, ...(isActive(item.path) ? styles.navItemActive : {}) }} onClick={() => handleNav(item.path)}>
                        {item.label}
                    </div>
                ))}
            </nav>

            <div style={styles.signOut} onClick={signOut}>Sign Out</div>
        </div>
    )
}
