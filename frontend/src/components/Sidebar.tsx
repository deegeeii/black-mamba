import { useNavigate, useLocation } from 'react-router-dom'
import { useLeague } from '../contexts/LeagueContext'
import { useAuth } from '../contexts/AuthContext'


const NAV_ITEMS = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'My Team', path: '/team' },
    { label: 'Matchups', path: '/matchups' },
    { label: 'Bets', path: '/bets' },
    { label: 'Tournaments', path: '/tournaments' },
    { label: 'Chat', path: '/chat' },
    { label: 'Ledger', path: '/ledger' },
    { label: 'Profile', path: '/profile' },
]


const styles: Record<string, React.CSSProperties> = {
    sidebar: {
        width: '220px',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'fixed',
        top: 0,
        left: 0,
        overflow: 'hidden',
    },
    wordmark: {
        color: '#00ff88',
        fontSize: '22px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        padding: '0 24px 24px',
        borderBottom: '1px solid #1a1a1a',
    },
    leagueSection: {
        padding: '16px 24px',
        borderBottom: '1px solid #1a1a1a',
    },
    leagueLabel: {
        color: '#666',
        fontSize: '11px',
        letterSpacing: '1px',
        textTransform: 'uppercase' as const,
        marginBottom: '8px',
    },
    select: {
        width: '100%',
        backgroundColor: '#1a1a1a',
        color: '#fff',
        border: '1px solid #333',
        borderRadius: '6px',
        padding: '8px',
        fontSize: '13px',
    },
    nav: {
        flex: 1,
        padding: '16px 0',
    },
    navItem: {
        display: 'block',
        padding: '12px 24px',
        color: '#aaa',
        textDecoration: 'none',
        fontSize: '14px',
        cursor: 'pointer',
        borderLeft: '3px solid transparent',
        transition: 'all 0.15s',
    },
    navItemActive: {
        color: '#00ff88',
        borderLeft: '3px solid #00ff88',
        backgroundColor: '#0f1f17',
    },
    signOut: {
        padding: '16px 24px',
        borderTop: '1px solid #1a1a1a',
        color: '#666',
        fontSize: '13px',
        cursor: 'pointer',
    },
}

export default function Sidebar() {
    const navigate = useNavigate()
    const location = useLocation()
    const { leagues, activeLeague, setActiveLeague } = useLeague()
    const { signOut } = useAuth()

    const GLOBAL_ROUTES = ['/dashboard', '/profile', '/ledger']

    const handleNav = (path: string) => {
        if (GLOBAL_ROUTES.includes(path)) {
            navigate(path)
            return
        }
        if (!activeLeague) return
        navigate(`/leagues/${activeLeague.id}${path}`)
    }

    const isActive = (path: string) => {
        if (GLOBAL_ROUTES.includes(path)) {
            return location.pathname === path
        }
        return location.pathname.includes(path)
    }
    

    return (
        <div style={styles.sidebar}>
            <div style={styles.wordmark}>BLACK MAMBA</div>

            <div style={styles.leagueSection}>
                <div style={styles.leagueLabel}>League</div>
                <select
                    style={styles.select}
                    value={activeLeague?.id || ''}
                    onChange={e => {
                        const league = leagues.find(l => l.id === e.target.value)
                        if (league) setActiveLeague(league)
                    }}
                >
                    {leagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
            </div>

            <nav style={styles.nav}>
                {NAV_ITEMS.map(item => (
                    <div
                        key={item.path}
                        style={{
                            ...styles.navItem,
                            ...(isActive(item.path) ? styles.navItemActive : {}),
                        }}
                        onClick={() => handleNav(item.path)}
                    >
                        {item.label}
                    </div>
                ))}
            </nav>

            <div style={styles.signOut} onClick={signOut}>Sign Out</div>
        </div>
    )
}