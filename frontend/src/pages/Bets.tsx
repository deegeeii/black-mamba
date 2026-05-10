import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import axios from 'axios'

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
        <div style={{ border: '1px solid #ccc', padding: '12px', marginTop: '8px' }} >
            <CardElement />
            {error && <p style={{ color: 'red' }} >{error}</p>}
            <button onClick={handleConfirm} disabled={loading} style={{ marginTop: '8px' }} >
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
    const [activeBetId, setActiveBetId] = useState('')

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

      const label = (userId: string | null) => {
        if (!userId) return 'Open'
        return userId === user?.id ? 'You' : userId.slice(0, 8)
      }

      if (loading) return <p>Loading bets...</p>

      return (
        <div>
          <h1>Side Bets</h1>
    
          <button onClick={() => setShowCreate(!showCreate)}>+ New Bet</button>
    
          {showCreate && (
            <div style={{ border: '1px solid #ccc', padding: '12px', margin: '8px 0' }}>
              <h3>Create a Bet</h3>
              <div>
                <label>Type </label>
                <select value={betType} onChange={(e) => setBetType(e.target.value)}>
                  <option value="weekly_matchup">Weekly Matchup</option>
                  <option value="season_long">Season Long</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label>Amount (cents) </label>
                <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} min={100} />
                <small> e.g. 1000 = $10.00</small>
              </div>
              {betType === 'weekly_matchup' && (
                <div>
                  <label>Week </label>
                  <input type="number" value={week} onChange={(e) => setWeek(Number(e.target.value))} min={1} max={18} />
                </div>
              )}
              <div>
                <label>Description </label>
                <input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <button onClick={handleCreate}>Create & Pay</button>
            </div>
          )}
    
          {clientSecret && (
            <ConfirmPayment
              clientSecret={clientSecret}
              onSuccess={() => { setClientSecret(''); fetchBets() }}
            />
          )}
    
          <h2>Active Bets</h2>
          {bets.length === 0 ? <p>No bets yet.</p> : bets.map((bet) => (
            <div key={bet.id} style={{ border: '1px solid #ccc', padding: '8px', margin: '8px 0' }}>
              <p><strong>{bet.bet_type}</strong> — ${(bet.amount / 100).toFixed(2)} each | Status: {bet.status}</p>
              <p>Proposer: {label(bet.proposer_id)} | Opponent: {label(bet.opponent_id)}</p>
              {bet.description && <p>{bet.description}</p>}
              {bet.week && <p>Week {bet.week}</p>}
              <p>Rake: {bet.rake_percent}% | Pot: ${(bet.amount * 2 / 100).toFixed(2)} | Winner gets: ${(bet.amount * 2 * (1 - bet.rake_percent / 100) / 100).toFixed(2)}</p>
              {bet.status === 'pending' && bet.proposer_id !== user?.id && (
                <button onClick={() => handleAccept(bet.id)}>Accept Bet</button>
              )}
              {bet.winner_id && <p>Winner: {label(bet.winner_id)}</p>}
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