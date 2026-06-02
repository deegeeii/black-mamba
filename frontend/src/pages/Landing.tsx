// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'

// ── DATA ───────────────────────────────────────────────────────────────────────
const features = [
    {
        icon: '🐍',
        title: 'Snake Draft',
        body: 'Live draft room with real-time pick tracking. Standard, Standard+, and Dynasty scoring modes.',
    },
    {
        icon: '💰',
        title: 'Side Bets',
        body: 'Head-to-head wagers and pool bets with Stripe-powered escrow. Real money, real stakes.',
    },
    {
        icon: '⚡',
        title: 'AI Quick Tourneys',
        body: 'The AI assembles a fantasy game around any live sporting event. World Cup. Playoffs. Olympics. Anything.',
    },
    {
        icon: '🤖',
        title: 'AI Commissioner',
        body: 'Your league gets its own AI bot — hype man, trash talker, or sensei. You pick the persona.',
    },
]

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function Landing() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-deep)',
            color: 'var(--text)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            <img
                src="/snake.png"
                style={{
                    position: 'absolute',
                    right: '-120px',
                    bottom: '80px',
                    width: '800px',
                    opacity: 0.06,
                    pointerEvents: 'none',
                }}
            />
        

            {/* ── Nav ── */}
            <nav style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '20px 40px',
                borderBottom: '1px solid var(--border)',
            }}>
                <span style={{
                    color: 'var(--accent)',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    letterSpacing: '3px',
                    fontFamily: 'Georgia, serif',
                }}>
                    BLACK MAMBA
                </span>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <Link
                        to="/support"
                        style={{ color: 'var(--text-dim)', fontSize: '13px', textDecoration: 'none' }}
                    >
                        Support
                    </Link>
                    <Link
                        to="/login"
                        style={{
                            color: 'var(--accent)',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                            border: '1px solid var(--accent)',
                            padding: '6px 16px',
                            borderRadius: 'var(--radius)',
                        }}
                    >
                        Sign In
                    </Link>
                </div>
            </nav>

            {/* ── Hero ── */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '100px 24px 80px',
            }}>
                <p style={{
                    color: 'var(--text-dim)',
                    fontSize: '12px',
                    letterSpacing: '4px',
                    textTransform: 'uppercase',
                    marginBottom: '20px',
                }}>
                    Fantasy Sports, Elevated
                </p>
                <h1 style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 'clamp(40px, 8vw, 80px)',
                    fontWeight: 'bold',
                    color: 'var(--accent)',
                    letterSpacing: '6px',
                    lineHeight: 1.1,
                    marginBottom: '24px',
                }}>
                    BLACK MAMBA
                </h1>
                <p style={{
                    color: 'var(--text-dim)',
                    fontSize: '17px',
                    maxWidth: '480px',
                    lineHeight: '1.7',
                    marginBottom: '40px',
                }}>
                    Draft your roster. Back it up with real money. Let the AI run the show when the season ends.
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <a
                        href="#"
                        style={{
                            backgroundColor: 'var(--accent)',
                            color: '#000',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            padding: '14px 32px',
                            borderRadius: 'var(--radius)',
                            textDecoration: 'none',
                            letterSpacing: '0.5px',
                        }}
                    >
                        Download the App
                    </a>
                    <Link
                        to="/signup"
                        style={{
                            backgroundColor: 'transparent',
                            color: 'var(--text)',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            padding: '14px 32px',
                            borderRadius: 'var(--radius)',
                            textDecoration: 'none',
                            border: '1px solid var(--border)',
                        }}
                    >
                        Play on Web
                    </Link>
                </div>
            </div>

            {/* ── Divider ── */}
            <div style={{
                width: '60px',
                height: '2px',
                backgroundColor: 'var(--accent)',
                margin: '0 auto 80px',
                opacity: 0.4,
            }} />

            {/* ── Features ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
                maxWidth: '960px',
                margin: '0 auto',
                padding: '0 24px 100px',
            }}>
                {features.map(({ icon, title, body }) => (
                    <div
                        key={title}
                        style={{
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '28px',
                        }}
                    >
                        <div style={{ fontSize: '28px', marginBottom: '14px' }}>{icon}</div>
                        <h3 style={{
                            color: 'var(--accent)',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            marginBottom: '10px',
                            letterSpacing: '0.5px',
                        }}>
                            {title}
                        </h3>
                        <p style={{
                            color: 'var(--text-dim)',
                            fontSize: '13px',
                            lineHeight: '1.7',
                        }}>
                            {body}
                        </p>
                    </div>
                ))}
            </div>

            {/* ── Footer ── */}
            <div style={{
                borderTop: '1px solid var(--border)',
                padding: '28px 40px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
            }}>
                <span style={{
                    color: 'var(--text-dim)',
                    fontSize: '12px',
                    letterSpacing: '1px',
                }}>
                    © 2026 Black Mamba Fantasy Sports
                </span>
                <div style={{ display: 'flex', gap: '24px' }}>
                    <Link to="/support" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none' }}>Support</Link>
                    <Link to="/privacy" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none' }}>Privacy</Link>
                    <Link to="/login" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none' }}>Sign In</Link>
                </div>
            </div>

        </div>
    )
}
