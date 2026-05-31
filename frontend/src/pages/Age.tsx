// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function AgeSuitability() {
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
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Age Suitability</p>
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '6px' }}>
                        Last updated: May 29, 2026
                    </p>
                </div>

                {/* ── Age Badge ── */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '32px',
                }}>
                    <div style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '2px solid var(--accent)',
                        borderRadius: '12px',
                        padding: '24px 48px',
                        textAlign: 'center',
                    }}>
                        <p style={{
                            color: 'var(--accent)',
                            fontSize: '48px',
                            fontWeight: 'bold',
                            fontFamily: 'Georgia, serif',
                            lineHeight: 1,
                            marginBottom: '8px',
                        }}>
                            18+
                        </p>
                        <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>
                            This app is rated for users 18 and older
                        </p>
                    </div>
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
                            title: 'Minimum Age Requirement',
                            body: `Black Mamba is intended exclusively for users who are 18 years of age or older. By creating an account, you confirm that you meet this requirement. Users found to be under 18 will have their accounts permanently removed.`,
                        },
                        {
                            title: 'Real Money Wagering',
                            body: `Black Mamba includes side bet functionality involving real money, processed securely through Stripe. Participation in real-money contests is restricted to adults (18+) and may be subject to additional legal restrictions depending on your jurisdiction. It is your responsibility to verify that participating in real-money fantasy sports is legal where you live.`,
                        },
                        {
                            title: 'Simulated Gambling Elements',
                            body: `In addition to real-money side bets, Black Mamba includes fantasy sports draft mechanics and tournament competition that simulate competitive wagering scenarios. These features are for entertainment purposes and are governed by fantasy sports regulations, not gambling laws, in most jurisdictions.`,
                        },
                        {
                            title: 'User-Generated Content',
                            body: `Black Mamba includes in-app league chat where users may post text, images, and GIFs. While we do not pre-moderate content, users are expected to adhere to our Terms of Service. Content that is explicit, abusive, or inappropriate should be reported to hello@blackmambafantasysports.com.`,
                        },
                        {
                            title: 'AI-Generated Content',
                            body: `The platform uses AI to generate commentary, scoring rules, and bot personas. AI responses are not pre-screened and may occasionally be unexpected. All AI content is for entertainment only.`,
                        },
                        {
                            title: 'Parental Notice',
                            body: `This app is not suitable for minors. If you believe a minor is using this platform, contact us immediately at hello@blackmambafantasysports.com and we will remove the account promptly.`,
                        },
                        {
                            title: 'Jurisdictional Restrictions',
                            body: `Real-money fantasy sports contests may be restricted or prohibited in certain states and countries. Black Mamba does not verify user location at signup. You are solely responsible for ensuring your participation is lawful in your jurisdiction.`,
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
                    <Link to="/terms" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none', marginRight: '24px' }}>Terms of Service</Link>
                    <Link to="/privacy" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none', marginRight: '24px' }}>Privacy Policy</Link>
                    <Link to="/support" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none', marginRight: '24px' }}>Support</Link>
                    <Link to="/" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none' }}>Home</Link>
                </div>

            </div>
        </div>
    )
}
