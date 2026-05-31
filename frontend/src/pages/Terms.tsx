// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { Link } from 'react-router-dom'

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function Terms() {
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
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Terms of Service</p>
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
                            title: '1. Acceptance of Terms',
                            body: `By creating an account or using Black Mamba, you agree to these Terms of Service. If you do not agree, do not use the app. You must be at least 18 years old to use Black Mamba.`,
                        },
                        {
                            title: '2. User Content',
                            body: `You retain ownership of content you submit — including team names, chat messages, and league settings. By submitting content, you grant Black Mamba a non-exclusive license to display and store that content for the purpose of operating the platform. You are responsible for ensuring your content does not violate any laws or third-party rights.`,
                        },
                        {
                            title: '3. AI-Generated Content',
                            body: `Black Mamba uses third-party AI services (Anthropic, OpenAI) to generate commentary, tournament scoring rules, and bot responses. AI-generated content is provided for entertainment purposes only and does not constitute professional advice. We are not responsible for the accuracy or appropriateness of AI-generated content.`,
                        },
                        {
                            title: '4. Real Money Bets and Payments',
                            body: `Side bets on Black Mamba involve real money held in escrow via Stripe. By placing a bet, you confirm that you are at least 18 years old and that participating in real-money fantasy sports contests is legal in your jurisdiction. Black Mamba takes a platform fee (rake) from settled bets. All payment processing is handled by Stripe and subject to Stripe's Terms of Service. We are not responsible for payment disputes arising from Stripe's processing.`,
                        },
                        {
                            title: '5. Platform Fees',
                            body: `Black Mamba charges a rake on side bet winnings. The current fee is disclosed at the time of bet settlement. Fees are non-refundable once a bet is settled.`,
                        },
                        {
                            title: '6. Prohibited Conduct',
                            body: `You agree not to:\n\n• Use the platform if you are under 18\n• Attempt to manipulate draft picks, bets, or league outcomes through unauthorized means\n• Use the platform in jurisdictions where real-money fantasy sports are prohibited\n• Harass, threaten, or abuse other users via league chat\n• Attempt to reverse-engineer or scrape the platform`,
                        },
                        {
                            title: '7. Account Termination',
                            body: `We reserve the right to suspend or terminate accounts that violate these terms, at our sole discretion. Upon termination, any pending bets will be cancelled and funds returned where possible.`,
                        },
                        {
                            title: '8. Disclaimer of Warranties',
                            body: `Black Mamba is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, accuracy of sports data, or outcomes of AI-generated content. Use the platform at your own risk.`,
                        },
                        {
                            title: '9. Limitation of Liability',
                            body: `To the fullest extent permitted by law, Black Mamba is not liable for any indirect, incidental, or consequential damages arising from your use of the platform, including losses from side bets or payment disputes.`,
                        },
                        {
                            title: '10. Changes to Terms',
                            body: `We may update these Terms at any time. Continued use of the platform after changes constitutes acceptance. We will update the date at the top of this page when changes are made.`,
                        },
                        {
                            title: '11. Contact',
                            body: `For questions about these Terms:\n\nhello@blackmambafantasysports.com\n\nBlack Mamba Fantasy Sports\nblackmambafantasysports.com`,
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
                    <Link to="/privacy" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none', marginRight: '24px' }}>Privacy Policy</Link>
                    <Link to="/support" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none', marginRight: '24px' }}>Support</Link>
                    <Link to="/" style={{ color: 'var(--text-dim)', fontSize: '12px', textDecoration: 'none' }}>Home</Link>
                </div>

            </div>
        </div>
    )
}
