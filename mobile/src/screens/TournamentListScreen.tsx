import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'

const API = process.env.EXPO_PUBLIC_API_URL


type Tournament = {
    id: string
    name: string
    sport: string
    status: string
    entry_fee: number
    prize_pool: number
    max_participants: number
    participant_count: number
    created_at: string
}

export default function TournamentListScreen() {
    const navigation = useNavigation()
    const { session } = useAuth()
    const { theme } = useTheme()
    const { activeLeague } = useLeague()

    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [loading, setLoading] = useState(true)

    const headers = { Authorization: `Bearer ${session?.access_token} `}

    useEffect(() => {
        if (!activeLeague || !session) return
        fetch(`${API}/leagues/${activeLeague.id}/tournaments`, { headers })
            .then(r => r.json())
            .then(data => { setTournaments(Array.isArray(data) ? data : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [activeLeague?.id, session])

    const statusColor = (statu: string) => {
        if (status === 'open') return theme.accent
        if (status === 'active') return theme.warning
        return theme.textDim
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Arena</Text>
                <View style={{ width: 60 }} />
            </View>

            {loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : tournaments.length === 0 ? (
                <Text style={[styles.empty, { color: theme.textDim }]}>No tournaments yet</Text>
            ) : (
                <FlatList
                    data={tournaments}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                            <View style={styles.cardTop}>
                                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                                <Text style={[styles.status, { color: statusColor(item.status) }]}>
                                    {item.status.toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[styles.sport, { color: theme.textDim }]}>{item.sport}</Text>
                            <View style={styles.row}>
                                <Text style={[styles.meta, { color: theme.textMuted }]}>
                                    {item.participant_count ?? 0}/{item.max_participants} teams
                                </Text>
                                {item.entry_fee > 0 && (
                                    <Text style={[styles.meta, { color: theme.textMuted }]}>
                                        ${(item.entry_fee / 100).toFixed(2)} entry
                                    </Text>
                                )}
                                {item.prize_pool > 0 && (
                                    <Text style={[styles.prize, { color: theme.accent }]}>
                                        ${(item.prize_pool / 100).toFixed(2)} pool
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}
                />
            )}
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
    card: {
        borderRadius: 10,
        borderWidth: 1,
        padding: 16,
    },
    cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: { fontSize: 15, fontWeight: 'bold', flex: 1, marginRight: 8 },
    status: { fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
    sport: { fontSize: 12, marginBottom: 10 },
    row: { flexDirection: 'row', gap: 16 },
    meta: { fontSize: 12 },
    prize: { fontSize: 12, fontWeight: 'bold' },
    empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
})
