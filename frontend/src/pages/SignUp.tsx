
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
      navigate('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <h1 style={{ color: 'var(--accent)', fontSize: '28px', letterSpacing: '3px', marginBottom: '8px' }}>BLACK MAMBA</h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Fantasy sports, elevated.</p>
            </div>

            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '32px' }}>
                <h2 style={{ marginBottom: '24px', fontSize: '18px' }}>Create Account</h2>
                <form onSubmit={handleSignUp}>
                    {[
                        { lbl: 'Email', type: 'email', val: email, set: setEmail },
                        { lbl: 'Password', type: 'password', val: password, set: setPassword },
                        { lbl: 'Confirm Password', type: 'password', val: confirm, set: setConfirm },
                    ].map(({ lbl, type, val, set }) => (
                        <div key={lbl} style={{ marginBottom: '16px' }}>
                            <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>{lbl}</label>
                            <input type={type} value={val} onChange={e => set(e.target.value)} required
                                style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px', outline: 'none' }} />
                        </div>
                    ))}
                    {error && <p style={{ color: 'var(--danger)', marginBottom: '16px', fontSize: '13px' }}>{error}</p>}
                    <button type="submit" disabled={loading} style={{
                        width: '100%', backgroundColor: loading ? 'var(--border)' : 'var(--accent)',
                        color: loading ? 'var(--text-dim)' : '#000', border: 'none',
                        borderRadius: 'var(--radius)', padding: '12px', fontWeight: 'bold',
                        fontSize: '14px', cursor: loading ? 'not-allowed' : 'pointer',
                        marginTop: '8px'
                    }}>
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>
                <p style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign In</Link>
                </p>
            </div>
        </div>
    </div>
  )

}
