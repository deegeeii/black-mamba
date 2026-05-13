import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigation } from '@react-navigation/native'
import { useLeague } from '../contexts/LeagueContext'
import { useState, useEffect } from 'react'


const API = process.env.EXPO_PUBLIC_API_URL


export default function DashboardScreen() {
    const { user, signOut, session } = useAuth()
    const navigation = useNavigation<any>()
    const { leagues, activeLeague, setActiveLeague } = useLeague()
    const { theme } = useTheme()
    const [ledger, setLedger] = useState<{ won: number; lost: number; balance: number } | null>(null)

    useEffect(() => {
        if (!activeLeague || !session) return
        fetch(`${API}/leagues/${activeLeague.id}/bets`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
        })
            .then(r => r.json())
            .then(data => {
                if (!Array.isArray(data)) return
                const myBets = data.filter((b: any) => b.status === 'settled')
                const won = myBets.filter((b: any) => b.winner_user_id === user?.id).reduce((s: number, b: any) => s + (b.amount || 0), 0)
                const lost = myBets.filter((b: any) => b.winner_user_id && b.winner_user_id !== user?.id).reduce((s: number, b: any) => s + (b.amount || 0), 0)
                setLedger({ won, lost, balance: won - lost })
            })
            .catch(() => {})
    }, [activeLeague?.id, session])



    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
                        <View style={styles.header}>
                <Text style={[styles.wordmark, { color: theme.accent }]}>BLACK MAMBA</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Arena')}>
                    <Text style={{ color: theme.accent, fontSize: 13, fontWeight: 'bold' }}>Arena ›</Text>
                </TouchableOpacity>

            </View>


            <Text style={[styles.welcome, { color: theme.textMuted }]}>Welcome back</Text>
            <Text style={[styles.email, { color: theme.text }]}>{user?.email}</Text>

            <View style={styles.cardRow}>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('MyTeam')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>My Team</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>View roster & lineup</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('Matchups')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Matchups</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>This week's games</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('Standings')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Standings</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>League rankings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('Bets')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Bets</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>H2H side bets</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('Chat')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Chat</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>League chat & AI bot</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('Profile')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Profile</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>Settings & appearance</Text>
                </TouchableOpacity>
            </View>
            {ledger !== null && (
                <View style={[styles.ledger, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.ledgerTitle, { color: theme.textMuted }]}>LEDGER</Text>
                    <View style={styles.ledgerRow}>
                        <View style={styles.ledgerItem}>
                            <Text style={[styles.ledgerAmt, { color: theme.accent }]}>${(ledger.won / 100).toFixed(2)}</Text>
                            <Text style={[styles.ledgerLbl, { color: theme.textDim }]}>Won</Text>
                        </View>
                        <View style={styles.ledgerItem}>
                            <Text style={[styles.ledgerAmt, { color: theme.danger }]}>${(ledger.lost / 100).toFixed(2)}</Text>
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
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    wordmark: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 3,
    },
    leagueRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    leagueBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },

    welcome: {
        fontSize: 14,
        marginBottom: 4,
    },
    email: {
        fontSize: 20,
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
        marginBottom: 4,
    },
    cardSub: {
        fontSize: 12,
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
        marginBottom: 12,
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
