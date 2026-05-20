
// ── IMPORTS ────────────────────────────────────────────────────────────────────
// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const FEATURES = [
    { icon: '🧠', title: 'AI Commissioner', desc: 'An AI bot runs your league — trash talk, analysis, weekly recaps.' },
    { icon: '💸', title: 'Real Money Bets', desc: 'Place side bets against your league mates. Real payouts.' },
    { icon: '⚡', title: 'AI Quick Tourneys', desc: 'AI spins up a fantasy tourney for any live sporting event.' },
    { icon: '📊', title: 'Deeper Scoring', desc: 'Standard, Standard+, and Dynasty formats with keeper support.' },
]

export default function SignUp() {

  // ── STATE ───────────────────────────────────────────────────────────────────
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()

  // ── HANDLERS ─────────────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  // ── SENT CONFIRMATION ────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-deep)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--accent)', fontSize: '28px', letterSpacing: '3px', marginBottom: '8px' }}>BLACK MAMBA</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '40px' }}>Fantasy sports, elevated.</p>
          <div style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '32px',
          }}>
            <p style={{ fontSize: '32px', marginBottom: '16px' }}>📬</p>
            <h2 style={{ marginBottom: '12px', fontSize: '18px' }}>Check your email</h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', lineHeight: '1.6' }}>
              We sent a confirmation link to <strong style={{ color: 'var(--text)' }}>{email}</strong>.
              Click it to activate your account, then come back to sign in.
            </p>
            <Link
              to="/login"
              style={{
                display: 'block',
                marginTop: '24px',
                color: 'var(--accent)',
                fontSize: '14px',
                textDecoration: 'none',
              }}
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── JSX ──────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-deep)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>

        {/* ── Brand Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--accent)', fontSize: '28px', letterSpacing: '3px', marginBottom: '8px' }}>BLACK MAMBA</h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Fantasy sports, elevated.</p>
        </div>

        {/* ── Sign Up Card ── */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '32px',
          marginBottom: '24px',
        }}>
          <h2 style={{ marginBottom: '24px', fontSize: '18px' }}>Create Account</h2>

          {/* ── Sign Up Form ── */}
          <form onSubmit={handleSignUp}>
            {[
              { lbl: 'Email', type: 'email', val: email, set: setEmail },
              { lbl: 'Password', type: 'password', val: password, set: setPassword },
              { lbl: 'Confirm Password', type: 'password', val: confirm, set: setConfirm },
            ].map(({ lbl, type, val, set }) => (
              <div key={lbl} style={{ marginBottom: '16px' }}>
                <label style={{
                  color: 'var(--text-dim)',
                  fontSize: '12px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase' as const,
                }}>
                  {lbl}
                </label>
                <input
                  type={type}
                  value={val}
                  onChange={e => set(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '10px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    marginTop: '6px',
                    outline: 'none',
                    boxSizing: 'border-box' as const,
                  }}
                />
              </div>
            ))}
            {error && <p style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '13px' }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? 'var(--border)' : 'var(--accent)',
                color: loading ? 'var(--text-dim)' : '#000',
                border: 'none',
                borderRadius: 'var(--radius)',
                padding: '12px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
              }}
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
          <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>

        {/* ── Why Black Mamba ── */}
        <p style={{
          color: 'var(--text-muted)',
          fontSize: '11px',
          letterSpacing: '1.5px',
          textAlign: 'center',
          marginBottom: '16px',
        }}>
          WHY BLACK MAMBA?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {FEATURES.map(f => (
            <div
              key={f.title}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '14px 16px',
                display: 'flex',
                gap: '14px',
                alignItems: 'flex-start',
              }}
            >
              <span style={{ fontSize: '20px' }}>{f.icon}</span>
              <div>
                <p style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '4px' }}>{f.title}</p>
                <p style={{ color: 'var(--text-dim)', fontSize: '12px', lineHeight: '1.5' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
