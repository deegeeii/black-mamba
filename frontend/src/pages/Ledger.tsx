import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

interface Bet {
    id: string
    league_id: string
    proposer_id: string
    opponent_id: string | null
    bet_type: string
    amount: number
    week: number | null
    description: string | null
    status: string
    winner_id: string | null
    rake_percent: number
    proposer_payment_intent: string | null
    opponent_payment_intent: string | null
}

interface LeagueBets {
    leagueName: string
    bets: Bet[]
}

export default function Ledger() {
    const { session, user } = useAuth()
    const { leagues } = useLeague()
    const [leagueBets, setLeagueBets] = useState<LeagueBets[]>([])
    const [loading, setLoading] = useState(true)

    const headers = useMemo(
        () => ({ Authorization: `Bearer ${session?.access_token}` }),
        [session?.access_token]
    )

    useEffect(() => {
        if (!leagues.length || !session) return
        Promise.allSettled(
            leagues.map(l =>
                axios.get(`${API_URL}/leagues/${l.id}/bets`, { headers })
                    .then(res => ({ leagueName: l.name, bets: res.data as Bet[] }))
            )
        ).then(results => {
            const data = results
                .filter(r => r.status === 'fulfilled')
                .map(r => (r as PromiseFulfilledResult<LeagueBets>).value)
            setLeagueBets(data)
            setLoading(false)
        })
    }, [leagues, session])

    const getResult = (bet: Bet): 'win' | 'loss' | 'pending' => {
        if (bet.status !== 'settled') return 'pending'
        return bet.winner_id === user?.id ? 'win' : 'loss'
    }

    const getNet = (bet: Bet): number => {
        if (bet.status !== 'settled') return 0
        const pot = bet.amount * 2
        const rake = Math.round(pot * bet.rake_percent / 100)
        if (bet.winner_id === user?.id) return pot - rake - bet.amount
        return -bet.amount
    }

    const allBets = leagueBets.flatMap(lb => lb.bets.map(b => ({ ...b, leagueName: lb.leagueName })))
    const settledBets = allBets.filter(b => b.status === 'settled')
    const totalWon = settledBets.filter(b => b.winner_id === user?.id)
        .reduce((sum, b) => sum + (b.amount * 2 * (1 - b.rake_percent / 100)), 0)
    const totalLost = settledBets.filter(b => b.winner_id !== user?.id && (b.proposer_id === user?.id || b.opponent_id === user?.id))
        .reduce((sum, b) => sum + b.amount, 0)
    const totalRake = settledBets.filter(b => b.winner_id === user?.id)
        .reduce((sum, b) => sum + Math.round(b.amount * 2 * b.rake_percent / 100), 0)
    const netBalance = totalWon - totalLost - totalRake

    if (loading) return <p>Loading ledger...</p>

    return (
        <div style={{ maxWidth: '900px' }}>
            <h1 style={{ marginBottom: '4px' }}>Money Ledger</h1>
    
            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap' }}>
                {[
                    { label: 'Total Won', value: totalWon, color: 'var(--accent)' },
                    { label: 'Total Lost', value: -totalLost, color: 'var(--danger)' },
                    { label: 'Rake Paid', value: -totalRake, color: 'var(--warning)' },
                    { label: 'Net Balance', value: netBalance, color: netBalance >= 0 ? 'var(--accent)' : 'var(--danger)' },
                ].map(card => (
                    <div key={card.label} style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '16px 24px',
                        minWidth: '140px',
                    }}>
                        <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginBottom: '8px' }}>{card.label}</div>
                        <div style={{ color: card.color, fontSize: '22px', fontWeight: 'bold' }}>
                            {card.value >= 0 ? '+' : ''}${(card.value / 100).toFixed(2)}
                        </div>
                    </div>
                ))}
            </div>
    
            {/* Per-league tables */}
            {leagueBets.map(lb => {
                const myBets = lb.bets.filter(b => b.proposer_id === user?.id || b.opponent_id === user?.id)
                if (!myBets.length) return null
                return (
                    <div key={lb.leagueName} style={{ marginBottom: '32px' }}>
                        <h2 style={{ color: 'var(--accent)', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                            {lb.leagueName}
                        </h2>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr style={{ color: 'var(--text-dim)', textAlign: 'left' }}>
                                    <th style={{ padding: '8px' }}>Type</th>
                                    <th style={{ padding: '8px' }}>Week</th>
                                    <th style={{ padding: '8px' }}>Amount</th>
                                    <th style={{ padding: '8px' }}>Status</th>
                                    <th style={{ padding: '8px' }}>Result</th>
                                    <th style={{ padding: '8px' }}>Rake</th>
                                    <th style={{ padding: '8px' }}>Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myBets.map(bet => {
                                    const result = getResult(bet)
                                    const net = getNet(bet)
                                    const rake = result === 'win' ? Math.round(bet.amount * 2 * bet.rake_percent / 100) : 0
                                    return (
                                        <tr key={bet.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                            <td style={{ padding: '8px', color: 'var(--text)' }}>{bet.bet_type}</td>
                                            <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{bet.week ?? '—'}</td>
                                            <td style={{ padding: '8px', color: 'var(--text)' }}>${(bet.amount / 100).toFixed(2)}</td>
                                            <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{bet.status}</td>
                                            <td style={{ padding: '8px', color: result === 'win' ? 'var(--accent)' : result === 'loss' ? 'var(--danger)' : 'var(--text-dim)' }}>
                                                {result === 'pending' ? '—' : result.toUpperCase()}
                                            </td>
                                            <td style={{ padding: '8px', color: 'var(--warning)' }}>
                                                {rake > 0 ? `-$${(rake / 100).toFixed(2)}` : '—'}
                                            </td>
                                            <td style={{ padding: '8px', color: net >= 0 ? 'var(--accent)' : 'var(--danger)', fontWeight: 'bold' }}>
                                                {net === 0 ? '—' : `${net > 0 ? '+' : ''}$${(net / 100).toFixed(2)}`}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )
            })}
    
            {allBets.length === 0 && <p style={{ color: 'var(--text-dim)' }}>No bets yet.</p>}
        </div>
    )
    
}
