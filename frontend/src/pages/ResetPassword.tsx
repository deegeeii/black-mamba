// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {

    // ── STATE ─────────────────────────────────────────────────────────────────
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    // ── HANDLERS ──────────────────────────────────────────────────────────────
    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirm) { setError('Passwords do not match'); return }
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.updateUser({ password })
        setLoading(false)
        if (error) setError(error.message)
        else navigate('/dashboard')
    }

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>

                {/* ── Brand Header ── */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ color: 'var(--accent)', fontSize: '28px', letterSpacing: '3px', marginBottom: '8px' }}>BLACK MAMBA</h1>
                </div>

                {/* ── Reset Password Card ── */}
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px' }}>
                    <h2 style={{ marginBottom: '24px', fontSize: '18px' }}>New Password</h2>

                    {/* ── Reset Form ── */}
                    <form onSubmit={handleReset}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>New Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px', outline: 'none' }} />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Confirm Password</label>
                            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required
                                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px', outline: 'none' }} />
                        </div>
                        {error && <p style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '13px' }}>{error}</p>}
                        <button type="submit" disabled={loading} style={{ width: '100%', backgroundColor: loading ? 'var(--border)' : 'var(--accent)', color: loading ? 'var(--text-dim)' : '#000', border: 'none', borderRadius: 'var(--radius)', padding: '12px', fontWeight: 'bold', fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer' }}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

// ── EXPORT ────────────────────────────────────────────────────────────────────
// exported as default above
