// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'

// ── TYPES ──────────────────────────────────────────────────────────────────────
type Standing = {
    user_id: string
    wins: number
    losses: number
    points_for: number
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API = process.env.EXPO_PUBLIC_API_URL

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function StandingsScreen() {

    // ── Context ───────────────────────────────────────────────────────────────
    const navigation = useNavigation()
    const { session } = useAuth()
    const { theme } = useTheme()
    const { activeLeague, getTeamName } = useLeague()

    // ── State ─────────────────────────────────────────────────────────────────
    const [standings, setStandings] = useState<Standing[]>([])
    const [loading, setLoading] = useState(true)

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeLeague || !session) return
        fetch(`${API}/leagues/${activeLeague.id}/standings`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
        })
            .then(r => r.json())
            .then(data => { setStandings(Array.isArray(data) ? data : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [activeLeague?.id, session])

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>

            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.textHeading }]}>Standings</Text>
                <View style={{ width: 60 }} />
            </View>

            {loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={standings}
                    keyExtractor={(_, i) => String(i)}
                    contentContainerStyle={styles.list}
                    ListHeaderComponent={
                        <View style={[styles.row, styles.headerRow]}>
                            <Text style={[styles.rank, { color: theme.textDim }]}>#</Text>
                            <Text style={[styles.teamName, { color: theme.textDim }]}>Team</Text>
                            <Text style={[styles.record, { color: theme.textDim }]}>W-L</Text>
                            <Text style={[styles.pts, { color: theme.textDim }]}>PF</Text>
                        </View>
                    }
                    renderItem={({ item, index }) => (
                        <View style={[styles.row, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                            <Text style={[styles.rank, { color: index === 0 ? theme.accent : theme.textMuted }]}>
                                {index + 1}
                            </Text>
                            <Text style={[styles.teamName, { color: theme.text }]} numberOfLines={1}>
                                {getTeamName(item.user_id)}
                            </Text>
                            <Text style={[styles.record, { color: theme.textMuted }]}>
                                {item.wins}-{item.losses}
                            </Text>
                            <Text style={[styles.pts, { color: theme.textMuted }]}>
                                {item.points_for?.toFixed(1) ?? '0.0'}
                            </Text>
                        </View>
                    )}
                />
            )}
        </View>
    )
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
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
        gap: 8,
    },
    headerRow: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
    },
    rank: {
        width: 28,
        fontSize: 14,
        fontWeight: 'bold',
    },
    teamName: {
        flex: 1,
        fontSize: 14,
    },
    record: {
        width: 48,
        fontSize: 13,
        textAlign: 'center',
    },
    pts: {
        width: 52,
        fontSize: 13,
        textAlign: 'right',
    },
})
