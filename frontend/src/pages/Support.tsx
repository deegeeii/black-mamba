// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function Support() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-deep)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
        }}>
            <div style={{ width: '100%', maxWidth: '560px' }}>

                {/* ── Brand ── */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{
                        color: 'var(--accent)',
                        fontSize: '26px',
                        letterSpacing: '3px',
                        marginBottom: '8px',
                    }}>
                        BLACK MAMBA
                    </h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Support Center</p>
                </div>

                {/* ── Contact Card ── */}
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '32px',
                    marginBottom: '16px',
                }}>
                    <h2 style={{ color: 'var(--text)', fontSize: '17px', marginBottom: '12px' }}>
                        Contact Us
                    </h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.7', marginBottom: '20px' }}>
                        For account issues, billing questions, or anything else — reach us directly at:
                    </p>
                    <a
                        href="mailto:hello@blackmambafantasysports.com"
                        style={{
                            display: 'inline-block',
                            color: 'var(--accent)',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            textDecoration: 'none',
                        }}
                    >
                        hello@blackmambafantasysports.com
                    </a>
                </div>

                {/* ── FAQ Card ── */}
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '32px',
                    marginBottom: '32px',
                }}>
                    <h2 style={{ color: 'var(--text)', fontSize: '17px', marginBottom: '20px' }}>
                        Common Questions
                    </h2>

                    {[
                        {
                            q: 'How do I delete my account?',
                            a: 'Email us at hello@blackmambafantasysports.com and we will delete your account and all associated data within 5 business days.',
                        },
                        {
                            q: 'How do side bets work?',
                            a: 'Side bets are held in escrow via Stripe. Funds are only captured from the losing party after a winner is determined.',
                        },
                        {
                            q: 'Why is my push token not working?',
                            a: 'Make sure notifications are enabled for Black Mamba in your device settings. Re-installing the app will also refresh your push token.',
                        },
                        {
                            q: 'How do I report a bug?',
                            a: 'Email us with a description of the issue and what device you are using. Screenshots are helpful.',
                        },
                    ].map(({ q, a }) => (
                        <div key={q} style={{ marginBottom: '20px' }}>
                            <p style={{
                                color: 'var(--text)',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                marginBottom: '6px',
                            }}>
                                {q}
                            </p>
                            <p style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6' }}>
                                {a}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ── Footer ── */}
                <div style={{ textAlign: 'center' }}>
                    <Link to="/privacy" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none', marginRight: '24px' }}>
                        Privacy Policy
                    </Link>
                    <Link to="/" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none' }}>
                        Home
                    </Link>
                </div>

            </div>
        </div>
    )
}
