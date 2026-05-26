import { useEffect, useState } from 'react'
import {
    View, Text, StyleSheet, FlatList, ActivityIndicator,
    TouchableOpacity, TextInput, Modal, Alert, ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'
import { useStripe } from '@stripe/stripe-react-native'

const API = process.env.EXPO_PUBLIC_API_URL

// ── Types ──────────────────────────────────────────────────────────────────────
type BetEntry = {
    id: string
    user_id: string
    side: string
    amount: number
    status: string
    payout_owed: number
}

type Bet = {
    id: string
    proposer_id: string
    opponent_id: string | null
    bet_category: string
    bet_type: string
    proposition: string
    amount: number
    week: number | null
    settle_mode: string
    outcome_options: string[] | null
    winning_side: string | null
    status: string
    winner_id: string | null
    payout_owed: number
    rake_percent: number
    entries: BetEntry[]
}

export default function BetsScreen() {
    const navigation = useNavigation()
    const { session, user } = useAuth()
    const { theme } = useTheme()
    const { activeLeague, members, getTeamName } = useLeague()
    const { initPaymentSheet, presentPaymentSheet } = useStripe()

    const isCommissioner = user?.id === activeLeague?.commissioner_id

    // ── State: List ───────────────────────────────────────────────────────────
    const [bets, setBets] = useState<Bet[]>([])
    const [loading, setLoading] = useState(true)

    // ── State: Payout Gate ────────────────────────────────────────────────────
    const [hasPayout, setHasPayout] = useState<boolean | null>(null)

    // ── State: Create Form ────────────────────────────────────────────────────
    const [showCreate, setShowCreate] = useState(false)
    const [creating, setCreating] = useState(false)
    const [betCategory, setBetCategory] = useState('h2h')
    const [betType, setBetType] = useState('weekly_matchup')
    const [proposition, setProposition] = useState('')
    const [amount, setAmount] = useState('10')
    const [settleMode, setSettleMode] = useState('manual')
    const [outcomeOptions, setOutcomeOptions] = useState('Yes, No')
    const [opponentId, setOpponentId] = useState('')
    const [week, setWeek] = useState('1')
    const [createError, setCreateError] = useState('')

    // ── State: Pool Entry ─────────────────────────────────────────────────────
    const [enteringBetId, setEnteringBetId] = useState<string | null>(null)
    const [enterSide, setEnterSide] = useState('')
    const [enterAmount, setEnterAmount] = useState('')

    // ── State: Settling ───────────────────────────────────────────────────────
    const [settlingBetId, setSettlingBetId] = useState<string | null>(null)
    const [settlingSide, setSettlingSide] = useState('')
    const [autoSettling, setAutoSettling] = useState<string | null>(null)

    const headers = { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }

    // ── Fetch Bets ────────────────────────────────────────────────────────────
    const fetchBets = () => {
        if (!activeLeague || !session) return
        fetch(`${API}/leagues/${activeLeague.id}/bets`, { headers })
            .then(r => r.json())
            .then(data => { setBets(Array.isArray(data) ? data : []); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => {
        if (!session) return
        fetch(`${API}/connect/accounts/status`, { headers })
            .then(r => r.json())
            .then(d => setHasPayout(d.has_account && d.onboarding_complete))
            .catch(() => setHasPayout(false))
    }, [session])

    useEffect(() => { fetchBets() }, [activeLeague?.id, session])

    // ── Handler: Create ───────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (creating || !activeLeague) return
        if (!proposition.trim()) { setCreateError('Enter a proposition'); return }
        setCreating(true)
        setCreateError('')
        try {
            const amountCents = Math.round(parseFloat(amount) * 100)
            const options = betCategory === 'pool'
                ? outcomeOptions.split(',').map(o => o.trim()).filter(Boolean)
                : null
            const res = await fetch(`${API}/leagues/${activeLeague.id}/bets`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    bet_category: betCategory,
                    bet_type: betType,
                    proposition: proposition.trim(),
                    amount: amountCents,
                    settle_mode: settleMode,
                    outcome_options: options,
                    opponent_id: betCategory === 'h2h' && opponentId ? opponentId : null,
                    week: betType === 'weekly_matchup' ? parseInt(week) : null,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setCreateError(data.detail || 'Failed to create bet'); setCreating(false); return }
            setShowCreate(false)
            setProposition(''); setAmount('10'); setOpponentId('')
            setOutcomeOptions('Yes, No'); setWeek('1')
            if (data.client_secret) {
                const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: data.client_secret,
                    merchantDisplayName: 'Black Mamba',
                })
                if (!initError) await presentPaymentSheet()
            }
            fetchBets()
        } catch {
            setCreateError('Network error')
        }
        setCreating(false)
    }

    // ── Handler: Accept H2H ───────────────────────────────────────────────────
    const handleAccept = async (bet: Bet) => {
        if (!activeLeague) return
        try {
            const res = await fetch(`${API}/leagues/${activeLeague.id}/bets/${bet.id}/accept`, { method: 'POST', headers })
            const data = await res.json()
            if (!res.ok) { Alert.alert('Error', data.detail || 'Failed to accept'); return }
            if (data.client_secret) {
                const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: data.client_secret,
                    merchantDisplayName: 'Black Mamba',
                })
                if (!initError) await presentPaymentSheet()
            }
            fetchBets()
        } catch {
            Alert.alert('Error', 'Network error')
        }
    }

    // ── Handler: Enter Pool ───────────────────────────────────────────────────
    const handleEnterPool = async (betId: string) => {
        if (!activeLeague || !enterSide || !enterAmount) return
        try {
            const amountCents = Math.round(parseFloat(enterAmount) * 100)
            const res = await fetch(`${API}/leagues/${activeLeague.id}/bets/${betId}/enter`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ side: enterSide, amount: amountCents }),
            })
            const data = await res.json()
            if (!res.ok) { Alert.alert('Error', data.detail || 'Failed to enter pool'); return }
            setEnteringBetId(null); setEnterSide(''); setEnterAmount('')
            if (data.client_secret) {
                const { error: initError } = await initPaymentSheet({
                    paymentIntentClientSecret: data.client_secret,
                    merchantDisplayName: 'Black Mamba',
                })
                if (!initError) await presentPaymentSheet()
            }
            fetchBets()
        } catch {
            Alert.alert('Error', 'Network error')
        }
    }

    // ── Handler: Settle ───────────────────────────────────────────────────────
    const handleSettle = async (betId: string) => {
        if (!activeLeague || !settlingSide) return
        try {
            const res = await fetch(`${API}/leagues/${activeLeague.id}/bets/${betId}/settle`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ winning_side: settlingSide }),
            })
            const data = await res.json()
            if (!res.ok) { Alert.alert('Error', data.detail || 'Failed to settle'); return }
            setSettlingBetId(null); setSettlingSide('')
            fetchBets()
        } catch {
            Alert.alert('Error', 'Network error')
        }
    }

    // ── Handler: Auto Settle ──────────────────────────────────────────────────
    const handleAutoSettle = async (betId: string) => {
        if (!activeLeague) return
        setAutoSettling(betId)
        try {
            const res = await fetch(`${API}/leagues/${activeLeague.id}/bets/${betId}/auto-settle`, { method: 'POST', headers })
            const data = await res.json()
            if (!res.ok) Alert.alert('Auto Settle', data.detail || 'Outcome may not be determined yet')
            fetchBets()
        } catch {
            Alert.alert('Error', 'Network error')
        }
        setAutoSettling(null)
    }

    // ── Handler: Delete ───────────────────────────────────────────────────────
    const handleDelete = (betId: string) => {
        Alert.alert('Delete Bet', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    if (!activeLeague) return
                    try {
                        await fetch(`${API}/leagues/${activeLeague.id}/bets/${betId}`, { method: 'DELETE', headers })
                        fetchBets()
                    } catch {
                        Alert.alert('Error', 'Failed to delete')
                    }
                },
            },
        ])
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    const label = (userId: string | null) => userId ? getTeamName(userId) : 'Open'

    const statusColor = (status: string) => {
        if (status === 'settled') return theme.textDim
        if (status === 'active' || status === 'open') return theme.warning
        return theme.accent
    }

    const canSettle = (bet: Bet) => isCommissioner || bet.proposer_id === user?.id

    // ── Render Bet Card ───────────────────────────────────────────────────────
    const renderBet = ({ item: bet }: { item: Bet }) => {
        const isMine = bet.proposer_id === user?.id
        const canAcceptH2H = bet.bet_category === 'h2h'
            && bet.status === 'pending'
            && !isMine
            && (!bet.opponent_id || bet.opponent_id === user?.id)
        const alreadyInPool = (bet.entries || []).some(e => e.user_id === user?.id)
        const canEnterPool = bet.bet_category === 'pool' && bet.status === 'open' && !alreadyInPool
        const isDeletable = isMine && ['pending', 'open'].includes(bet.status)

        return (
            <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>

                {/* ── Card Header ── */}
                <View style={styles.cardHeader}>
                    <Text style={[styles.categoryBadge, { color: theme.accent }]}>
                        {bet.bet_category === 'pool' ? 'POOL' : 'H2H'} · {bet.bet_type.replace(/_/g, ' ')}
                    </Text>
                    <Text style={{ color: statusColor(bet.status), fontSize: 11, fontWeight: 'bold' }}>
                        {bet.status.toUpperCase()}
                    </Text>
                </View>

                {/* ── Proposition ── */}
                <Text style={[styles.proposition, { color: theme.text }]}>"{bet.proposition}"</Text>

                {/* ── H2H Details ── */}
                {bet.bet_category === 'h2h' && (
                    <>
                        <Text style={[styles.meta, { color: theme.textMuted }]}>
                            {label(bet.proposer_id)} vs {bet.opponent_id ? label(bet.opponent_id) : 'Open challenge'}
                        </Text>
                        <Text style={[styles.meta, { color: theme.textDim }]}>
                            ${(bet.amount / 100).toFixed(2)} each · pot ${(bet.amount * 2 / 100).toFixed(2)}
                        </Text>
                    </>
                )}

                {/* ── Pool Details ── */}
                {bet.bet_category === 'pool' && (
                    <>
                        <Text style={[styles.meta, { color: theme.textDim }]}>
                            Min ${(bet.amount / 100).toFixed(2)} · {bet.rake_percent}% rake
                        </Text>
                        {(bet.outcome_options || []).map(side => {
                            const sideEntries = (bet.entries || []).filter(e => e.side === side)
                            const sidePot = sideEntries.reduce((s, e) => s + e.amount, 0)
                            const isWinner = bet.winning_side === side
                            return (
                                <View key={side} style={[styles.sideBlock, {
                                    backgroundColor: theme.bgDeep,
                                    borderColor: isWinner ? theme.accent : theme.border,
                                }]}>
                                    <View style={styles.sideHeader}>
                                        <Text style={{ color: isWinner ? theme.accent : theme.text, fontWeight: 'bold', fontSize: 13 }}>
                                            {side}{isWinner ? ' ✓' : ''}
                                        </Text>
                                        <Text style={{ color: theme.accent, fontSize: 13 }}>${(sidePot / 100).toFixed(2)}</Text>
                                    </View>
                                    {sideEntries.map(e => (
                                        <Text key={e.id} style={{ color: theme.textDim, fontSize: 12, marginTop: 2 }}>
                                            {label(e.user_id)} — ${(e.amount / 100).toFixed(2)}
                                            {e.status === 'won' ? ` · payout $${(e.payout_owed / 100).toFixed(2)}` : ''}
                                            {e.status === 'lost' ? ' · lost' : ''}
                                        </Text>
                                    ))}
                                    {sideEntries.length === 0 && (
                                        <Text style={{ color: theme.textDim, fontSize: 12 }}>No entries yet</Text>
                                    )}
                                </View>
                            )
                        })}
                    </>
                )}

                {bet.week ? <Text style={[styles.meta, { color: theme.textDim }]}>Week {bet.week}</Text> : null}
                {bet.settle_mode === 'auto' && bet.status !== 'settled' && (
                    <Text style={[styles.meta, { color: theme.textDim }]}>Settlement: AI auto-detect</Text>
                )}
                {bet.status === 'settled' && bet.bet_category === 'h2h' && (
                    <Text style={{ color: theme.accent, fontSize: 13, marginTop: 4 }}>
                        Winner: {label(bet.winner_id)} · ${(bet.payout_owed / 100).toFixed(2)} owed
                    </Text>
                )}

                {/* ── Actions ── */}
                <View style={styles.actions}>

                    {/* Accept H2H */}
                    {canAcceptH2H && (
                        hasPayout
                            ? <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.accentSec }]}
                                onPress={() => handleAccept(bet)}
                            >
                                <Text style={{ color: theme.btnText, fontWeight: 'bold', fontSize: 13 }}>Accept & Pay</Text>
                            </TouchableOpacity>
                            : <Text style={{ color: theme.textDim, fontSize: 12 }}>Set up payouts in Profile first</Text>
                    )}

                    {/* Enter Pool */}
                    {canEnterPool && enteringBetId !== bet.id && (
                        hasPayout
                            ? <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: theme.accentSec }]}
                                onPress={() => { setEnteringBetId(bet.id); setEnterSide(bet.outcome_options?.[0] || '') }}
                            >
                                <Text style={{ color: theme.btnText, fontWeight: 'bold', fontSize: 13 }}>Enter Pool</Text>
                            </TouchableOpacity>
                            : <Text style={{ color: theme.textDim, fontSize: 12 }}>Set up payouts in Profile first</Text>
                    )}

                    {/* Settle */}
                    {canSettle(bet) && bet.status !== 'settled' && settlingBetId !== bet.id && (
                        <>
                            <TouchableOpacity
                                style={[styles.actionBtn, { borderWidth: 1, borderColor: theme.border, backgroundColor: 'transparent' }]}
                                onPress={() => { setSettlingBetId(bet.id); setSettlingSide('') }}
                            >
                                <Text style={{ color: theme.text, fontSize: 13 }}>Settle</Text>
                            </TouchableOpacity>
                            {bet.settle_mode === 'auto' && (
                                <TouchableOpacity
                                    style={[styles.actionBtn, { borderWidth: 1, borderColor: theme.accent, backgroundColor: 'transparent', opacity: autoSettling === bet.id ? 0.5 : 1 }]}
                                    onPress={() => handleAutoSettle(bet.id)}
                                    disabled={autoSettling === bet.id}
                                >
                                    <Text style={{ color: theme.accent, fontSize: 13 }}>
                                        {autoSettling === bet.id ? 'Searching...' : 'Auto Settle'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {/* Delete */}
                    {isDeletable && (
                        <TouchableOpacity
                            style={[styles.actionBtn, { borderWidth: 1, borderColor: theme.danger, backgroundColor: 'transparent' }]}
                            onPress={() => handleDelete(bet.id)}
                        >
                            <Text style={{ color: theme.danger, fontSize: 13 }}>Delete</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* ── Pool Entry Form ── */}
                {enteringBetId === bet.id && (
                    <View style={[styles.inlineForm, { backgroundColor: theme.bgDeep }]}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                            {(bet.outcome_options || []).map(side => (
                                <TouchableOpacity key={side} onPress={() => setEnterSide(side)}
                                    style={[styles.chip, { backgroundColor: enterSide === side ? theme.accent : theme.bgCard, borderColor: enterSide === side ? theme.accent : theme.border }]}>
                                    <Text style={{ color: enterSide === side ? '#000' : theme.text, fontWeight: 'bold', fontSize: 13 }}>{side}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                            value={enterAmount}
                            onChangeText={setEnterAmount}
                            placeholder={`Min $${(bet.amount / 100).toFixed(2)}`}
                            placeholderTextColor={theme.textDim}
                            keyboardType="decimal-pad"
                        />
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { flex: 1, backgroundColor: !enterSide || !enterAmount ? theme.border : theme.accentSec }]}
                                onPress={() => handleEnterPool(bet.id)}
                                disabled={!enterSide || !enterAmount}
                            >
                                <Text style={{ color: !enterSide || !enterAmount ? theme.textDim : theme.btnText, fontWeight: 'bold', fontSize: 13 }}>Pay & Enter</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { borderWidth: 1, borderColor: theme.border, backgroundColor: 'transparent' }]}
                                onPress={() => setEnteringBetId(null)}
                            >
                                <Text style={{ color: theme.textDim, fontSize: 13 }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ── Settle Form ── */}
                {settlingBetId === bet.id && (
                    <View style={[styles.inlineForm, { backgroundColor: theme.bgDeep }]}>
                        <Text style={{ color: theme.textDim, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>DECLARE WINNER</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                            {(bet.bet_category === 'pool'
                                ? (bet.outcome_options || [])
                                : [bet.proposer_id, bet.opponent_id].filter(Boolean) as string[]
                            ).map(opt => (
                                <TouchableOpacity key={opt} onPress={() => setSettlingSide(opt)}
                                    style={[styles.chip, { backgroundColor: settlingSide === opt ? theme.accent : theme.bgCard, borderColor: settlingSide === opt ? theme.accent : theme.border }]}>
                                    <Text style={{ color: settlingSide === opt ? '#000' : theme.text, fontSize: 13 }}>
                                        {bet.bet_category === 'pool' ? opt : label(opt)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { flex: 1, backgroundColor: !settlingSide ? theme.border : theme.danger }]}
                                onPress={() => handleSettle(bet.id)}
                                disabled={!settlingSide}
                            >
                                <Text style={{ color: !settlingSide ? theme.textDim : '#fff', fontWeight: 'bold', fontSize: 13 }}>Confirm</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, { borderWidth: 1, borderColor: theme.border, backgroundColor: 'transparent' }]}
                                onPress={() => setSettlingBetId(null)}
                            >
                                <Text style={{ color: theme.textDim, fontSize: 13 }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        )
    }

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>

            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.textHeading }]}>Side Bets</Text>
                <TouchableOpacity onPress={() => { setShowCreate(true); setCreateError('') }}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>+ New</Text>
                </TouchableOpacity>
            </View>

            {/* ── Payout Warning Banner ── */}
            {hasPayout === false && (
                <View style={[styles.banner, { backgroundColor: theme.bgCard, borderColor: theme.warning }]}>
                    <Text style={{ color: theme.warning, fontSize: 13 }}>
                        Set up payouts in Profile → Payouts to accept or enter bets.
                    </Text>
                </View>
            )}

            {/* ── Bets List ── */}
            {loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : bets.length === 0 ? (
                <Text style={[styles.empty, { color: theme.textDim }]}>No bets yet</Text>
            ) : (
                <FlatList
                    data={bets}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={renderBet}
                />
            )}

            {/* ── Create Bet Modal ── */}
            <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
                <ScrollView
                    style={{ flex: 1, backgroundColor: theme.bg }}
                    contentContainerStyle={{ padding: 24, paddingTop: 48, paddingBottom: 60 }}
                >
                    {/* ── Modal Header ── */}
                    <View style={styles.modalHeader}>
                        <Text style={[styles.title, { color: theme.text }]}>New Bet</Text>
                        <TouchableOpacity onPress={() => setShowCreate(false)}>
                            <Text style={{ color: theme.textDim, fontSize: 15 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {createError ? <Text style={{ color: theme.danger, marginBottom: 12 }}>{createError}</Text> : null}

                    {/* ── Bet Category ── */}
                    <Text style={[styles.label, { color: theme.textMuted }]}>BET TYPE</Text>
                    <View style={styles.toggleRow}>
                        {(['h2h', 'pool'] as const).map(c => (
                            <TouchableOpacity key={c}
                                style={[styles.toggleBtn, { flex: 1, backgroundColor: betCategory === c ? theme.accent : theme.bgCard, borderColor: betCategory === c ? theme.accent : theme.border }]}
                                onPress={() => setBetCategory(c)}
                            >
                                <Text style={{ color: betCategory === c ? '#000' : theme.text, fontWeight: 'bold', fontSize: 13 }}>
                                    {c === 'h2h' ? 'Head to Head' : 'Pool Bet'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Proposition ── */}
                    <Text style={[styles.label, { color: theme.textMuted }]}>PROPOSITION</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                        value={proposition}
                        onChangeText={setProposition}
                        placeholder={betCategory === 'h2h' ? 'e.g. Chiefs beat Eagles Sunday' : 'e.g. Who wins the Super Bowl?'}
                        placeholderTextColor={theme.textDim}
                        multiline
                    />

                    {/* ── Pool: Outcome Options ── */}
                    {betCategory === 'pool' && (
                        <>
                            <Text style={[styles.label, { color: theme.textMuted }]}>OUTCOME OPTIONS (comma separated)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                                value={outcomeOptions}
                                onChangeText={setOutcomeOptions}
                                placeholder="Yes, No"
                                placeholderTextColor={theme.textDim}
                            />
                        </>
                    )}

                    {/* ── Amount ── */}
                    <Text style={[styles.label, { color: theme.textMuted }]}>{betCategory === 'pool' ? 'MIN ENTRY ($)' : 'AMOUNT ($)'}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="10.00"
                        placeholderTextColor={theme.textDim}
                        keyboardType="decimal-pad"
                    />

                    {/* ── H2H: Opponent Chips ── */}
                    {betCategory === 'h2h' && (
                        <>
                            <Text style={[styles.label, { color: theme.textMuted }]}>CHALLENGE (optional — leave blank for open)</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                                {members.filter(m => m.user_id !== user?.id).map(m => (
                                    <TouchableOpacity key={m.user_id}
                                        style={[styles.chip, { backgroundColor: opponentId === m.user_id ? theme.accent : theme.bgCard, borderColor: opponentId === m.user_id ? theme.accent : theme.border }]}
                                        onPress={() => setOpponentId(opponentId === m.user_id ? '' : m.user_id)}
                                    >
                                        <Text style={{ color: opponentId === m.user_id ? '#000' : theme.textMuted, fontSize: 13 }}>
                                            {m.team_name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* ── Bet Category: Weekly / Season / Custom ── */}
                    <Text style={[styles.label, { color: theme.textMuted }]}>CATEGORY</Text>
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        {[['weekly_matchup', 'Weekly'], ['season_long', 'Season'], ['custom', 'Custom']].map(([val, lbl]) => (
                            <TouchableOpacity key={val}
                                style={[styles.chip, { backgroundColor: betType === val ? theme.accent : theme.bgCard, borderColor: betType === val ? theme.accent : theme.border }]}
                                onPress={() => setBetType(val)}
                            >
                                <Text style={{ color: betType === val ? '#000' : theme.textMuted, fontSize: 13 }}>{lbl}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Week (weekly only) ── */}
                    {betType === 'weekly_matchup' && (
                        <>
                            <Text style={[styles.label, { color: theme.textMuted }]}>WEEK</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                                value={week}
                                onChangeText={setWeek}
                                placeholder="1"
                                placeholderTextColor={theme.textDim}
                                keyboardType="number-pad"
                            />
                        </>
                    )}

                    {/* ── Settlement ── */}
                    <Text style={[styles.label, { color: theme.textMuted }]}>SETTLEMENT</Text>
                    <View style={styles.toggleRow}>
                        {[['manual', 'Manual'], ['auto', 'Auto (AI)']].map(([val, lbl]) => (
                            <TouchableOpacity key={val}
                                style={[styles.toggleBtn, { flex: 1, backgroundColor: settleMode === val ? theme.accent : theme.bgCard, borderColor: settleMode === val ? theme.accent : theme.border }]}
                                onPress={() => setSettleMode(val)}
                            >
                                <Text style={{ color: settleMode === val ? '#000' : theme.textMuted, fontSize: 13 }}>{lbl}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Submit ── */}
                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: creating ? theme.border : theme.accentSec }]}
                        onPress={handleCreate}
                        disabled={creating}
                    >
                        {creating
                            ? <ActivityIndicator color={theme.btnText} />
                            : <Text style={{ color: theme.btnText, fontWeight: 'bold', fontSize: 15 }}>
                                {betCategory === 'h2h' ? 'Create & Pay' : 'Create Pool'}
                            </Text>
                        }
                    </TouchableOpacity>
                </ScrollView>
            </Modal>
        </View>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontFamily: 'Georgia',
        fontSize: 17,
        fontWeight: 'bold',
     },
    list: {
        padding: 16,
        gap: 12,
        paddingBottom: 40,
    },
    empty: { 
        textAlign: 'center', 
        marginTop: 60, 
        fontSize: 14 
    },
    card: { 
        borderRadius: 10, 
        padding: 16, 
        borderWidth: 1 
    },
    cardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginBottom: 8 
    },
    categoryBadge: { 
        fontSize: 11, 
        fontWeight: 'bold', 
        letterSpacing: 1 
    },
    proposition: { 
        fontSize: 15, 
        fontWeight: 'bold',
        marginBottom: 8 
    },
    meta: { 
        fontSize: 13, 
        marginBottom: 4 
    },
    sideBlock: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 6,
    },
    sideHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    actions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 12,
    },
    actionBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineForm: {
        marginTop: 12,
        padding: 12,
        borderRadius: 8,
    },
    chip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
    },
    banner: {
        margin: 16,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    label: {
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: 6,
        marginTop: 16,
    },
    toggleRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 4,
    },
    toggleBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    submitBtn: {
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 32,
    },
})
