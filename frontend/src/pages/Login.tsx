
// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import SnakeWatermark from '../components/SnakeWatermark'


export default function Login() {

    // ── STATE ─────────────────────────────────────────────────────────────────
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [resetMode, setResetMode] = useState(false)
    const [resetSent, setResetSent] = useState(false)

    const navigate = useNavigate()

    // ── HANDLERS ──────────────────────────────────────────────────────────────
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            navigate('/dashboard')
        }
    }

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        })
        setLoading(false)
        if (error) setError(error.message)
        else setResetSent(true)
    }

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: 'var(--bg-deep)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
               <SnakeWatermark />
                <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px', position: 'relative', zIndex: 1 }}>


                {/* ── Brand Header ── */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ color: 'var(--accent)', fontSize: '28px', letterSpacing: '3px', marginBottom: '8px' }}>BLACK MAMBA</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Fantasy sports, elevated.</p>
                </div>

                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px' }}>
                    {resetMode ? (
                        <>
                            {/* ── Reset Password Card ── */}
                            <h2 style={{ marginBottom: '8px', fontSize: '18px' }}>Reset Password</h2>
                            {resetSent ? (
                                <p style={{ color: 'var(--accent)', fontSize: '14px', marginBottom: '20px' }}>Check your email for a reset link.</p>
                            ) : (
                                <>
                                    {/* ── Reset Form ── */}
                                    <form onSubmit={handleReset}>
                                        <div style={{ marginBottom: '16px' }}>
                                            <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Email</label>
                                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px', outline: 'none' }} />
                                        </div>
                                        {error && <p style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '13px' }}>{error}</p>}
                                        <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: loading ? 'var(--border)' : 'var(--accent)', color: loading ? 'var(--text-dim)' : '#000', border: 'none', borderRadius: 'var(--radius)', padding: '12px', fontWeight: 'bold', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                                            {loading ? 'Sending...' : 'Send Reset Link'}
                                        </button>
                                    </form>
                                </>
                            )}
                            <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px' }}>
                                <button onClick={() => { setResetMode(false); setResetSent(false) }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '13px' }}>← Back to Sign In</button>
                            </p>
                        </>
                    ) : (
                        <>
                            {/* ── Sign In Card ── */}
                            <h2 style={{ marginBottom: '24px', fontSize: '18px' }}>Sign In</h2>

                            {/* ── Sign In Form ── */}
                            <form onSubmit={handleLogin}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Email</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                        style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px', outline: 'none' }} />
                                </div>
                                <div style={{ marginBottom: '8px' }}>
                                    <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Password</label>
                                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                                        style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px', outline: 'none' }} />
                                </div>
                                <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                                    <button type="button" onClick={() => setResetMode(true)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '12px' }}>Forgot password?</button>
                                </div>
                                {error && <p style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '13px' }}>{error}</p>}
                                <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: loading ? 'var(--border)' : 'var(--accent)', color: loading ? 'var(--text-dim)' : '#000', border: 'none', borderRadius: 'var(--radius)', padding: '12px', fontWeight: 'bold', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                                    {loading ? 'Signing in...' : 'Sign In'}
                                </button>
                            </form>
                            <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                                Don't have an account? <Link to="/signup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign Up</Link>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
// exported as default above
