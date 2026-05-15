import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Modal } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'
import { useStripe } from '@stripe/stripe-react-native'

const API = process.env.EXPO_PUBLIC_API_URL

type Bet = {
    id: string
    proposer_id: string
    opponent_id: string
    amount: number
    bet_type: string
    status: string
    winner_id: string | null
}

export default function BetsScreen() {
    const navigation = useNavigation()
    const { session, user } = useAuth()
    const { theme } = useTheme()
    const { activeLeague, members, getTeamName } = useLeague()
    const { initPaymentSheet, presentPaymentSheet } = useStripe()

    const [bets, setBets] = useState<Bet[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [amount, setAmount] = useState('')
    const [betType, setBetType] = useState('weekly_matchup')
    const [opponentId, setOpponentId] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const headers = { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }

    const fetchBets = () => {
        if (!activeLeague || !session) return
        fetch(`${API}/leagues/${activeLeague.id}/bets`, { headers })
            .then(r => r.json())
            .then(data => { setBets(Array.isArray(data) ? data : []); setLoading(false) })
            .catch(() => setLoading(false))
    }

    useEffect(() => { fetchBets() }, [activeLeague?.id, session])

    const handleCreate = async () => {
        if (!amount) { setError('Enter an amount'); return }
        setSubmitting(true)
        setError('')
        console.log('posting to:', `${API}/leagues/${activeLeague!.id}/bets`)
        console.log('body:', JSON.stringify({
            opponent_id: opponentId.trim() || null,
            amount: Math.round(parseFloat(amount) * 100),
            bet_type: betType,
            week: 1,
        }))

        try {
            const res = await fetch(`${API}/leagues/${activeLeague!.id}/bets`, {
                method: 'POST', headers,
                body: JSON.stringify({
                    opponent_id: opponentId.trim() || null,
                    amount: Math.round(parseFloat(amount) * 100),
                    bet_type: betType,
                    week: 1,
                }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.detail || 'Failed to create bet'); setSubmitting(false); return }
            const { client_secret } = data
            const { error: initError } = await initPaymentSheet({ paymentIntentClientSecret: client_secret, merchantDisplayName: 'Black Mamba' })
            if (initError) { setError(initError.message); setSubmitting(false); return }
            const { error: payError } = await presentPaymentSheet()
            if (payError) { setError(payError.message); setSubmitting(false); return }
            setShowCreate(false)
            setAmount(''); setOpponentId(''); setBetType('weekly')
            fetchBets()
        } catch (e) { console.log('bet error:', e); setError('Failed to create bet') }
        setSubmitting(false)
    }
    

    const handleAccept = async (bet: Bet) => {
        try {
            const res = await fetch(`${API}/leagues/${activeLeague!.id}/bets/${bet.id}/accept`, { method: 'POST', headers })
            const { client_secret } = await res.json()
            const { error: initError } = await initPaymentSheet({ paymentIntentClientSecret: client_secret, merchantDisplayName: 'Black Mamba' })
            if (initError) return
            const { error: payError } = await presentPaymentSheet()
            if (!payError) fetchBets()
        } catch {}
    }

    const statusColor = (status: string) => {
        if (status === 'accepted') return theme.accent
        if (status === 'settled') return theme.textDim
        return theme.warning
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Bets</Text>
                <TouchableOpacity onPress={() => setShowCreate(true)}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>+ New</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : bets.length === 0 ? (
                <Text style={[styles.empty, { color: theme.textDim }]}>No bets yet</Text>
            ) : (
                <FlatList
                    data={bets}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => {
                        const isMine = item.proposer_id === user?.id
                        const canAccept = item.status === 'pending' && !isMine && (!item.opponent_id || item.opponent_id === user?.id)
                        return (
                            <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                <View style={styles.cardHeader}>
                                <Text style={{ color: theme.textDim, fontSize: 12 }}>
                                    {item.bet_type}
                                </Text>
                                <Text style={{ color: statusColor(item.status), fontSize: 12, fontWeight: 'bold' }}>
                                    {item.status.toUpperCase()}
                                </Text>
                            </View>
                            <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 6 }}>
                                {getTeamName(item.proposer_id)} vs {item.opponent_id ? getTeamName(item.opponent_id) : 'Open'}
                            </Text>
                            <Text style={{ color: theme.accent, fontSize: 24, fontWeight: 'bold', marginVertical: 8 }}>
                                ${(item.amount / 100).toFixed(2)}
                            </Text>

                                {canAccept && (
                                    <TouchableOpacity
                                        style={[styles.acceptBtn, { backgroundColor: theme.accent }]}
                                        onPress={() => handleAccept(item)}
                                    >
                                        <Text style={{ color: '#000', fontWeight: 'bold' }}>Accept & Pay</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        )
                    }}
                />
            )}

            <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet">
                <View style={{ flex: 1, backgroundColor: theme.bg, padding: 24, paddingTop: 48 }}>
                    <View style={styles.modalHeader}>
                        <Text style={[styles.title, { color: theme.text }]}>New Bet</Text>
                        <TouchableOpacity onPress={() => setShowCreate(false)}>
                            <Text style={{ color: theme.textDim, fontSize: 15 }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                    {error ? <Text style={{ color: theme.danger, marginBottom: 12 }}>{error}</Text> : null}

                    <Text style={[styles.label, { color: theme.textMuted }]}>OPPONENT (optional — leave blank for open bet)</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                        {members
                            .filter(m => m.user_id !== user?.id)
                            .map(m => (
                                <TouchableOpacity
                                    key={m.user_id}
                                    style={[styles.typeBtn, { backgroundColor: opponentId === m.user_id ? theme.accent : theme.bgCard, borderColor: opponentId === m.user_id ? theme.accent : theme.border }]}
                                    onPress={() => setOpponentId(opponentId === m.user_id ? '' : m.user_id)}
                                >
                                    <Text style={{ color: opponentId === m.user_id ? '#000' : theme.textMuted, fontSize: 13 }}>
                                        {m.team_name}
                                    </Text>
                                </TouchableOpacity>
                            ))
                        }
                    </View>


                    <Text style={[styles.label, { color: theme.textMuted }]}>AMOUNT (USD)</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="5.00"
                        placeholderTextColor={theme.textDim}
                        keyboardType="decimal-pad"
                    />

                    <Text style={[styles.label, { color: theme.textMuted }]}>BET TYPE</Text>
                    <View style={styles.typeRow}>
                        {['weekly_matchup', 'season_long', 'custom'].map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.typeBtn, { backgroundColor: betType === t ? theme.accent : theme.bgCard, borderColor: betType === t ? theme.accent : theme.border }]}
                                onPress={() => setBetType(t)}
                            >
                                <Text style={{ color: betType === t ? '#000' : theme.textMuted, fontSize: 13 }}>{t.replace('_', ' ')}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: theme.accent }]}
                        onPress={handleCreate}
                        disabled={submitting}
                    >
                        {submitting ? <ActivityIndicator color="#000" /> : <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 15 }}>Place Bet</Text>}
                    </TouchableOpacity>
                </View>
            </Modal>
        </View>
    )
}

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
    title: { fontSize: 17, fontWeight: 'bold' },
    list: { padding: 16, gap: 12 },
    card: { borderRadius: 10, padding: 16, borderWidth: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    acceptBtn: { padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    label: { fontSize: 11, letterSpacing: 1, marginBottom: 6, marginTop: 16 },
    input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 15, marginBottom: 4 },
    typeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
    typeBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
    submitBtn: { padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32 },
})
