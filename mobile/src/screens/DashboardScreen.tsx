// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { useLeague } from '../contexts/LeagueContext'
import { useState, useEffect, useCallback } from 'react'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API = process.env.EXPO_PUBLIC_API_URL

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function DashboardScreen() {

    // ── Context ───────────────────────────────────────────────────────────────
    const { user, signOut, session } = useAuth()
    const navigation = useNavigation<any>()
    const { leagues, activeLeague, setActiveLeague } = useLeague()
    const { theme } = useTheme()

    // ── State ─────────────────────────────────────────────────────────────────
    const [ledger, setLedger] = useState<{ won: number; lost: number; balance: number } | null>(null)
    const [pendingTrades, setPendingTrades] = useState(0)
    const [openBets, setOpenBets] = useState(0)
    const [username, setUsername] = useState<string | null>(null)

    useFocusEffect(useCallback(() => {
        if (!session) return
        fetch(`${API}/profile/`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
        })
            .then(r => r.json())
            .then(d => setUsername(d.username || null))
            .catch(() => {})
    }, [session]))


    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeLeague || !session) return
        const h = { Authorization: `Bearer ${session.access_token}` }
        Promise.allSettled([
            fetch(`${API}/leagues/${activeLeague.id}/bets`, { headers: h }).then(r => r.json()),
            fetch(`${API}/leagues/${activeLeague.id}/trades`, { headers: h }).then(r => r.json()),
        ]).then(([betsRes, tradesRes]) => {
            if (betsRes.status === 'fulfilled' && Array.isArray(betsRes.value)) {
                const data = betsRes.value
                const settled = data.filter((b: any) => b.status === 'settled')
                const won = settled
                    .filter((b: any) => b.winner_id === user?.id)
                    .reduce((s: number, b: any) => s + (b.amount || 0), 0)
                const lost = settled
                    .filter((b: any) => b.winner_id && b.winner_id !== user?.id)
                    .reduce((s: number, b: any) => s + (b.amount || 0), 0)
                setLedger({ won, lost, balance: won - lost })
                const actionable = data.filter((b: any) =>
                    b.status === 'pending' &&
                    b.proposer_id !== user?.id &&
                    (!b.opponent_id || b.opponent_id === user?.id)
                )
                setOpenBets(actionable.length)
            }
            if (tradesRes.status === 'fulfilled' && Array.isArray(tradesRes.value)) {
                const incoming = tradesRes.value.filter(
                    (t: any) => t.opponent_id === user?.id && t.status === 'pending'
                )
                setPendingTrades(incoming.length)
            }
        }).catch(() => {})
    }, [activeLeague?.id, session])

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.bg }}
            contentContainerStyle={styles.content}
        >
            {/* ── Header ── */}
            <View style={styles.header}>
                <View>
                    <Text style={[styles.wordmark, { color: theme.accent }]}>BLACK MAMBA</Text>
                    {activeLeague && (
                        <Text style={[styles.leagueName, { color: theme.textDim }]}>{activeLeague.name}</Text>
                    )}
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('Arena')}>
                    <Text style={{ color: theme.accent, fontSize: 13, fontWeight: 'bold' }}>Arena ›</Text>
                </TouchableOpacity>
            </View>

            {/* ── Welcome ── */}
            <Text style={[styles.welcome, { color: theme.textMuted }]}>Hey there</Text>
            <Text style={[styles.email, { color: theme.text }]}>{username || user?.email}</Text>

            {/* ── Card Grid ── */}
            <View style={styles.cardRow}>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('MyTeam')}
                >
                    <View style={styles.dotRow}>
                        <Text style={[styles.cardLabel, { color: theme.text }]}>My Team</Text>
                        {pendingTrades > 0 && <View style={[styles.dot, { backgroundColor: '#ffcc44' }]} />}
                    </View>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>View roster & lineup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('Matchups')}
                >
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Matchups</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>This week's games</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('Standings')}
                >
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Standings</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>League rankings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('Bets')}
                >
                    <View style={styles.dotRow}>
                        <Text style={[styles.cardLabel, { color: theme.text }]}>Bets</Text>
                        {openBets > 0 && <View style={[styles.dot, { backgroundColor: '#ffcc44' }]} />}
                    </View>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>H2H side bets</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('Chat')}
                >
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Chat</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>League chat & AI bot</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Profile</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>Settings & appearance</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('LeagueHome')}
                >
                    <Text style={[styles.cardLabel, { color: theme.text }]}>League</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>Settings, rosters & history</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                    onPress={() => navigation.navigate('Headlines')}
                >
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Headlines</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>NFL news</Text>
                </TouchableOpacity>
            </View>

            {/* ── Ledger ── */}
            {ledger !== null && (
                <View style={[styles.ledger, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <View style={styles.ledgerHeader}>
                        <Text style={[styles.ledgerTitle, { color: theme.textMuted }]}>LEDGER</Text>
                        {activeLeague && (
                            <Text style={[styles.ledgerLeague, { color: theme.textDim }]}>{activeLeague.name}</Text>
                        )}
                    </View>
                    <View style={styles.ledgerRow}>
                        <View style={styles.ledgerItem}>
                            <Text style={[styles.ledgerAmt, { color: theme.accent }]}>
                                ${(ledger.won / 100).toFixed(2)}
                            </Text>
                            <Text style={[styles.ledgerLbl, { color: theme.textDim }]}>Won</Text>
                        </View>
                        <View style={styles.ledgerItem}>
                            <Text style={[styles.ledgerAmt, { color: theme.danger }]}>
                                ${(ledger.lost / 100).toFixed(2)}
                            </Text>
                            <Text style={[styles.ledgerLbl, { color: theme.textDim }]}>Lost</Text>
                        </View>
                        <View style={styles.ledgerItem}>
                            <Text style={[styles.ledgerAmt, { color: ledger.balance >= 0 ? theme.accent : theme.danger }]}>
                                {ledger.balance >= 0 ? '+' : ''}${(ledger.balance / 100).toFixed(2)}
                            </Text>
                            <Text style={[styles.ledgerLbl, { color: theme.textDim }]}>Balance</Text>
                        </View>
                    </View>
                </View>
            )}

        </ScrollView>
    )
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    content: {
        padding: 24,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    wordmark: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 3,
    },
    leagueName: {
        fontSize: 12,
        letterSpacing: 1,
        marginTop: 3,
    },
    welcome: {
        fontSize: 15,
        marginBottom: 4,
    },
    email: {
        fontSize: 19,
        fontWeight: 'bold',
        marginBottom: 32,
    },
    cardRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    card: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 10,
        padding: 18,
    },
    cardLabel: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    cardSub: {
        fontSize: 12,
    },
    dotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    ledger: {
        borderRadius: 10,
        borderWidth: 1,
        padding: 16,
        marginTop: 8,
    },
    ledgerTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
    ledgerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 12,
    },
    ledgerLeague: {
        fontSize: 11,
        letterSpacing: 0.5,
    },    
    ledgerRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    ledgerItem: {
        alignItems: 'center',
    },
    ledgerAmt: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    ledgerLbl: {
        fontSize: 11,
    },
})
