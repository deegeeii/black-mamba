// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function Privacy() {
    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--bg-deep)',
            padding: '60px 24px',
        }}>
            <div style={{ width: '100%', maxWidth: '680px', margin: '0 auto' }}>

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
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Privacy Policy</p>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '6px' }}>
                        Last updated: May 29, 2026
                    </p>
                </div>

                {/* ── Content ── */}
                <div style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '40px',
                }}>
                    {[
                        {
                            title: '1. Information We Collect',
                            body: `When you create an account, we collect your email address, username, and team name. When you participate in side bets, payment information is processed securely by Stripe — we never store your card details. We collect your device's push notification token to deliver in-app alerts. We also collect basic usage data such as league activity and draft picks.`,
                        },
                        {
                            title: '2. How We Use Your Information',
                            body: `We use your information to operate your fantasy league account, process and escrow side bet payments via Stripe, send push notifications for league activity (picks, bets, chat messages), and send transactional emails via Resend. We do not sell your personal information to third parties.`,
                        },
                        {
                            title: '3. Third-Party Services',
                            body: `Black Mamba uses the following third-party services:\n\n• Supabase — authentication and database\n• Stripe — payment processing and escrow\n• Resend — transactional email delivery\n• Expo — push notification delivery\n• ESPN (public API) — NFL news and player data\n• Anthropic / OpenAI — AI-generated commentary and tournament scoring\n\nEach service operates under its own privacy policy.`,
                        },
                        {
                            title: '4. Data Retention',
                            body: `Your account data is retained for as long as your account is active. If you request account deletion, we will remove your personal data within 5 business days. Aggregate and anonymized data may be retained for analytical purposes.`,
                        },
                        {
                            title: '5. Your Rights',
                            body: `You have the right to access, correct, or delete your personal data at any time. To make a request, contact us at hello@blackmambafantasysports.com. We will respond within 5 business days.`,
                        },
                        {
                            title: '6. Children\'s Privacy',
                            body: `Black Mamba is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has created an account, contact us and we will remove it promptly.`,
                        },
                        {
                            title: '7. Changes to This Policy',
                            body: `We may update this Privacy Policy from time to time. When we do, we will update the date at the top of this page. Continued use of the app after changes constitutes acceptance of the updated policy.`,
                        },
                        {
                            title: '8. Contact',
                            body: `For any privacy-related questions or requests:\n\nhello@blackmambafantasysports.com\n\nBlack Mamba Fantasy Sports\nblackmambafantasysports.com`,
                        },
                    ].map(({ title, body }) => (
                        <div key={title} style={{ marginBottom: '32px' }}>
                            <h2 style={{
                                color: 'var(--text)',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                marginBottom: '10px',
                            }}>
                                {title}
                            </h2>
                            <p style={{
                                color: 'var(--text-dim)',
                                fontSize: '13px',
                                lineHeight: '1.8',
                                whiteSpace: 'pre-line',
                            }}>
                                {body}
                            </p>
                        </div>
                    ))}
                </div>

                {/* ── Footer ── */}
                <div style={{ textAlign: 'center', marginTop: '32px' }}>
                    <Link to="/support" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none', marginRight: '24px' }}>
                        Support
                    </Link>
                    <Link to="/" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none' }}>
                        Home
                    </Link>
                </div>

            </div>
        </div>
    )
}
