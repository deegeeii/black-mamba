// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useNavigate } from 'react-router-dom'

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function Onboarding() {

    const navigate = useNavigate()

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
        }}>
            <div style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>

                {/* ── Brand ── */}
                <h1 style={{
                    color: 'var(--accent)',
                    fontSize: '28px',
                    letterSpacing: '4px',
                    marginBottom: '8px',
                }}>
                    BLACK MAMBA
                </h1>
                <p style={{
                    color: 'var(--text-dim)',
                    fontSize: '12px',
                    letterSpacing: '2px',
                    marginBottom: '56px',
                }}>
                    Fantasy Sports
                </p>

                <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>Welcome</h2>
                <p style={{
                    color: 'var(--text-dim)',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    marginBottom: '48px',
                }}>
                    Get started by creating your own league or joining one with an invite code.
                </p>

                {/* ── Create a League ── */}
                <button
                    onClick={() => navigate('/create-league')}
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--accent-sec)',
                        color: 'var(--btn-text)',
                        border: 'none',
                        borderRadius: 'var(--radius)',
                        padding: '20px',
                        cursor: 'pointer',
                        marginBottom: '14px',
                    }}
                >
                    <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0' }}>Create a League</p>
                    <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-dim)' }}>You'll be the commissioner</p>
                </button>

                {/* ── Join a League ── */}
                <button
                    onClick={() => navigate('/join-league')}
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '20px',
                        cursor: 'pointer',
                    }}
                >
                    <p style={{ fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0' }}>Join a League</p>
                    <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-dim)' }}>Enter an invite code</p>
                </button>

            </div>
        </div>
    )
}
