import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import axios from 'axios'
import { useLeague } from '../contexts/LeagueContext'

const API_URL = import.meta.env.VITE_API_URL
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)


interface Bet {
    id: string
    proposer_id: string
    opponent_id: string | null
    bet_type: string
    amount: number
    week: number | null
    description: string | null
    status: string
    winner_id: string | null
    rake_percent: number
}

function ConfirmPayment({ clientSecret, onSuccess }: { clientSecret: string, onSuccess: () => void }) {
    const stripe = useStripe()
    const elements = useElements()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleConfirm = async () => {
        if (!stripe || !elements) return
        setLoading(true)
        setError('')
        const card = elements.getElement(CardElement)
        if (!card) return

        const { error } = await stripe.confirmCardPayment(clientSecret, {
            payment_method: { card }
        })

        if (error) {
            setError(error.message || 'Payment failed')
            setLoading(false)
        } else {
            onSuccess()
        }
    }

    return (
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginTop: '8px', backgroundColor: 'var(--bg-card)' }}>
          <CardElement options={{
              style: {
                  base: {
                      color: '#ffffff',
                      backgroundColor: '#1a1a1a',
                      fontSize: '15px',
                      '::placeholder': { color: '#666' },
                  },
                  invalid: { color: '#ff4444' }
              }
          }} />
          {error && <p style={{ color: 'var(--danger)', marginTop: '8px' }}>{error}</p>}
          <button onClick={handleConfirm} disabled={loading} style={{
              marginTop: '12px',
              backgroundColor: loading ? 'var(--border)' : 'var(--accent)',
              color: loading ? 'var(--text-dim)' : '#000',
              border: 'none',
              borderRadius: 'var(--radius)',
              padding: '8px 20px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
          }}>
              {loading ? 'Processing...' : 'Confirm Payment'}
          </button>
      </div>
  )
  
  
}

function BetsInner() {
    const { leagueId } = useParams<{ leagueId: string }>()
    const { session, user } = useAuth()
    const [bets, setBets] = useState<Bet[]>([])
    const [loading, setLoading] = useState(true)
    const [clientSecret, setClientSecret] = useState('')
    const [, setActiveBetId] = useState('')
    const { getTeamName } = useLeague()

    // Create Form
    const [betType, setBetType] = useState('weekly_matchup')
    const [amount, setAmount] = useState(500)
    const [week, setWeek] = useState(1)
    const [description, setDescription] = useState('')
    const [showCreate, setShowCreate] = useState(false)

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}` }),
        [session?.access_token]
    )

    const fetchBets = async () => {
        const res = await axios.get(`${API_URL}/leagues/${leagueId}/bets`, { headers })
        setBets(res.data)
        setLoading(false)
      }
    
    useEffect(() => { fetchBets() }, [])

    const handleCreate = async () => {
        const res = await axios.post(
            `${API_URL}/leagues/${leagueId}/bets`,
            { bet_type: betType, amount, week: betType === 'weekly_matchup' ? week : null, description },
            { headers }
        )
        setClientSecret(res.data.client_secret)
        setActiveBetId(res.data.bet_id)
        setShowCreate(false)
        fetchBets()
    }

    const handleAccept = async (betId: string) => {
        const res = await axios.post(
          `${API_URL}/leagues/${leagueId}/bets/${betId}/accept`,
          {},
          { headers }
        )
        setClientSecret(res.data.client_secret)
        setActiveBetId(res.data.bet_id)
        fetchBets()
      }

      const label = (userId: string | null) => getTeamName(userId)


      if (loading) return <p>Loading bets...</p>

      return (
        <div style={{ maxWidth: '700px' }}>
            <h1 style={{ marginBottom: '16px' }}>Side Bets</h1>
    
            <button onClick={() => setShowCreate(!showCreate)} style={{
                backgroundColor: 'var(--accent)', color: '#000', border: 'none',
                borderRadius: 'var(--radius)', padding: '10px 20px',
                cursor: 'pointer', fontWeight: 'bold', marginBottom: '16px'
            }}>+ New Bet</button>
    
            {showCreate && (
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px', marginBottom: '16px' }}>
                    <h3 style={{ color: 'var(--accent)', marginBottom: '16px' }}>Create a Bet</h3>
                    {[
                        { lbl: 'Type', el: <select value={betType} onChange={e => setBetType(e.target.value)} style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px' }}><option value="weekly_matchup">Weekly Matchup</option><option value="season_long">Season Long</option><option value="custom">Custom</option></select> },
                        { lbl: 'Amount (cents)', el: <><input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} min={100} style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px' }} /><small style={{ color: 'var(--text-dim)' }}>e.g. 1000 = $10.00</small></> },
                        { lbl: 'Description', el: <input value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px' }} /> },
                    ].map(({ lbl, el }) => (
                        <div key={lbl} style={{ marginBottom: '12px' }}>
                            <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>{lbl}</label>
                            {el}
                        </div>
                    ))}
                    {betType === 'weekly_matchup' && (
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase' as const }}>Week</label>
                            <input type="number" value={week} onChange={e => setWeek(Number(e.target.value))} min={1} max={18} style={{ width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', color: 'var(--text)', fontSize: '14px', marginTop: '6px' }} />
                        </div>
                    )}
                    <button onClick={handleCreate} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', cursor: 'pointer', fontWeight: 'bold' }}>Create & Pay</button>
                </div>
            )}
    
            {clientSecret && (
                <ConfirmPayment clientSecret={clientSecret} onSuccess={() => { setClientSecret(''); fetchBets() }} />
            )}
    
            <h2 style={{ marginBottom: '12px', marginTop: '8px' }}>Active Bets</h2>
            {bets.length === 0 ? (
                <p style={{ color: 'var(--text-dim)' }}>No bets yet.</p>
            ) : bets.map(bet => (
                <div key={bet.id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <span style={{ color: 'var(--accent)', fontWeight: 'bold', textTransform: 'uppercase' as const, fontSize: '12px', letterSpacing: '1px' }}>{bet.bet_type}</span>
                        <span style={{ color: bet.status === 'settled' ? 'var(--accent)' : 'var(--warning)', fontSize: '12px' }}>{bet.status}</span>
                    </div>
                    <p style={{ color: 'var(--text)', marginBottom: '4px' }}>${(bet.amount / 100).toFixed(2)} each</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>Proposer: {label(bet.proposer_id)} | Opponent: {label(bet.opponent_id)}</p>
                    {bet.description && <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>{bet.description}</p>}
                    {bet.week && <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '4px' }}>Week {bet.week}</p>}
                    <p style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '8px' }}>Rake: {bet.rake_percent}% | Pot: ${(bet.amount * 2 / 100).toFixed(2)} | Winner gets: ${(bet.amount * 2 * (1 - bet.rake_percent / 100) / 100).toFixed(2)}</p>
                    {bet.status === 'pending' && bet.proposer_id !== user?.id && (
                        <button onClick={() => handleAccept(bet.id)} style={{ backgroundColor: 'var(--accent)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>Accept Bet</button>
                    )}
                    {bet.winner_id && <p style={{ color: 'var(--accent)', marginTop: '8px', fontSize: '13px' }}>Winner: {label(bet.winner_id)}</p>}
                </div>
            ))}
        </div>
    )
    
  }
    
    export default function Bets() {
      return (
        <Elements stripe={stripePromise}>
          <BetsInner />
        </Elements>
      )    
}