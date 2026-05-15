import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'

const API = process.env.EXPO_PUBLIC_API_URL
const CURRENT_WEEK = 1

type Matchup = {
    id: string
    home_user_id: string
    away_user_id: string
    home_points: number
    away_points: number
    winner_user_id: string | null
    week: number
}

type PlayoffMatchup = {
    id: string
    home_user_id: string
    away_user_id: string
    home_points: number
    away_points: number
    winner_user_id: string | null
    week: number
    round: string
}

const ROUND_LABELS: Record<string, string> = {
    wildcard: 'Wild Card',
    semifinal: 'Semifinal',
    championship: 'Championship',
}

export default function MatchupsScreen() {
    const navigation = useNavigation()
    const { session, user } = useAuth()
    const { theme } = useTheme()
    const { activeLeague, getTeamName } = useLeague()

    const [tab, setTab] = useState<'matchups' | 'playoffs'>('matchups')
    const [matchups, setMatchups] = useState<Matchup[]>([])
    const [playoffs, setPlayoffs] = useState<PlayoffMatchup[]>([])
    const [week, setWeek] = useState(CURRENT_WEEK)
    const [loading, setLoading] = useState(true)
    const [playoffsLoading, setPlayoffsLoading] = useState(false)

    const headers = { Authorization: `Bearer ${session?.access_token}` }

    useEffect(() => {
        if (!activeLeague || !session) return
        setLoading(true)
        fetch(`${API}/leagues/${activeLeague.id}/matchups?week=${week}`, { headers })
            .then(r => r.json())
            .then(data => { setMatchups(Array.isArray(data) ? data : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [activeLeague?.id, session, week])

    useEffect(() => {
        if (tab !== 'playoffs' || !activeLeague || !session) return
        setPlayoffsLoading(true)
        fetch(`${API}/leagues/${activeLeague.id}/playoffs`, { headers })
            .then(r => r.json())
            .then(data => { setPlayoffs(Array.isArray(data) ? data : []); setPlayoffsLoading(false) })
            .catch(() => setPlayoffsLoading(false))
    }, [tab, activeLeague?.id, session])

    const isMyMatchup = (m: Matchup | PlayoffMatchup) =>
        m.home_user_id === user?.id || m.away_user_id === user?.id

    const playoffsByRound = playoffs.reduce<Record<string, PlayoffMatchup[]>>((acc, m) => {
        const key = m.round || 'unknown'
        if (!acc[key]) acc[key] = []
        acc[key].push(m)
        return acc
    }, {})

    const roundOrder = ['wildcard', 'semifinal', 'championship']

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Matchups</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={[styles.tabRow, { borderBottomColor: theme.borderSubtle }]}>
                {(['matchups', 'playoffs'] as const).map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, tab === t && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
                        onPress={() => setTab(t)}
                    >
                        <Text style={{ color: tab === t ? theme.accent : theme.textDim, fontWeight: tab === t ? 'bold' : 'normal', fontSize: 14 }}>
                            {t === 'matchups' ? 'Season' : 'Playoffs'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'matchups' ? (
                <>
                    <View style={styles.weekRow}>
                        <TouchableOpacity onPress={() => setWeek(w => Math.max(1, w - 1))}>
                            <Text style={{ color: theme.accent, fontSize: 20, paddingHorizontal: 16 }}>‹</Text>
                        </TouchableOpacity>
                        <Text style={{ color: theme.text, fontSize: 15, fontWeight: 'bold' }}>Week {week}</Text>
                        <TouchableOpacity onPress={() => setWeek(w => w + 1)}>
                            <Text style={{ color: theme.accent, fontSize: 20, paddingHorizontal: 16 }}>›</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
                    ) : matchups.length === 0 ? (
                        <Text style={[styles.empty, { color: theme.textDim }]}>No matchups for week {week}</Text>
                    ) : (
                        <FlatList
                            data={matchups}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.list}
                            renderItem={({ item }) => {
                                const isMine = isMyMatchup(item)
                                const homeWon = item.winner_user_id === item.home_user_id
                                const awayWon = item.winner_user_id === item.away_user_id
                                return (
                                    <View style={[styles.card, {
                                        backgroundColor: theme.bgCard,
                                        borderColor: isMine ? theme.accent : theme.border,
                                        borderWidth: isMine ? 1.5 : 1,
                                    }]}>
                                        {isMine && <Text style={[styles.myTag, { color: theme.accent }]}>YOUR MATCHUP</Text>}
                                        <View style={styles.matchRow}>
                                            <View style={styles.teamCol}>
                                                <Text style={[styles.teamName, { color: homeWon ? theme.accent : theme.text }]} numberOfLines={1}>
                                                    {getTeamName(item.home_user_id)}
                                                </Text>
                                                <Text style={[styles.score, { color: homeWon ? theme.accent : theme.textMuted }]}>
                                                    {item.home_points?.toFixed(1) ?? '—'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.vs, { color: theme.textDim }]}>vs</Text>
                                            <View style={[styles.teamCol, styles.teamColRight]}>
                                                <Text style={[styles.teamName, { color: awayWon ? theme.accent : theme.text }]} numberOfLines={1}>
                                                    {getTeamName(item.away_user_id)}
                                                </Text>
                                                <Text style={[styles.score, { color: awayWon ? theme.accent : theme.textMuted }]}>
                                                    {item.away_points?.toFixed(1) ?? '—'}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.status, { color: theme.textDim }]}>
                                            {item.winner_user_id ? 'Final' : 'In Progress'}
                                        </Text>
                                    </View>
                                )
                            }}
                        />
                    )}
                </>
            ) : (
                playoffsLoading ? (
                    <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
                ) : playoffs.length === 0 ? (
                    <Text style={[styles.empty, { color: theme.textDim }]}>Playoffs not started yet</Text>
                ) : (
                    <FlatList
                        data={roundOrder.filter(r => playoffsByRound[r])}
                        keyExtractor={r => r}
                        contentContainerStyle={styles.list}
                        renderItem={({ item: round }) => (
                            <View>
                                <Text style={[styles.roundLabel, { color: theme.textMuted }]}>
                                    {ROUND_LABELS[round] ?? round.toUpperCase()}
                                </Text>
                                {playoffsByRound[round].map(m => {
                                    const isMine = isMyMatchup(m)
                                    const homeWon = m.winner_user_id === m.home_user_id
                                    const awayWon = m.winner_user_id === m.away_user_id
                                    return (
                                        <View key={m.id} style={[styles.card, {
                                            backgroundColor: theme.bgCard,
                                            borderColor: isMine ? theme.accent : theme.border,
                                            borderWidth: isMine ? 1.5 : 1,
                                            marginBottom: 10,
                                        }]}>
                                            {isMine && <Text style={[styles.myTag, { color: theme.accent }]}>YOUR MATCHUP</Text>}
                                            <View style={styles.matchRow}>
                                                <View style={styles.teamCol}>
                                                    <Text style={[styles.teamName, { color: homeWon ? theme.accent : theme.text }]} numberOfLines={1}>
                                                        {getTeamName(m.home_user_id)}
                                                    </Text>
                                                    <Text style={[styles.score, { color: homeWon ? theme.accent : theme.textMuted }]}>
                                                        {m.home_points?.toFixed(1) ?? '—'}
                                                    </Text>
                                                </View>
                                                <Text style={[styles.vs, { color: theme.textDim }]}>vs</Text>
                                                <View style={[styles.teamCol, styles.teamColRight]}>
                                                    <Text style={[styles.teamName, { color: awayWon ? theme.accent : theme.text }]} numberOfLines={1}>
                                                        {getTeamName(m.away_user_id)}
                                                    </Text>
                                                    <Text style={[styles.score, { color: awayWon ? theme.accent : theme.textMuted }]}>
                                                        {m.away_points?.toFixed(1) ?? '—'}
                                                    </Text>
                                                </View>
                                            </View>
                                            {m.winner_user_id && (
                                                <Text style={[styles.status, { color: theme.accent }]}>
                                                    Winner: {getTeamName(m.winner_user_id)}
                                                </Text>
                                            )}
                                        </View>
                                    )
                                })}
                            </View>
                        )}
                    />
                )
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
    tabRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
    },
    weekRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    list: { padding: 16, gap: 12 },
    roundLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    card: { borderRadius: 10, padding: 16 },
    myTag: { fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginBottom: 8 },
    matchRow: { flexDirection: 'row', alignItems: 'center' },
    teamCol: { flex: 1 },
    teamColRight: { alignItems: 'flex-end' },
    teamName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
    score: { fontSize: 22, fontWeight: 'bold' },
    vs: { fontSize: 12, paddingHorizontal: 12 },
    status: { fontSize: 11, marginTop: 10, textAlign: 'center' },
    empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
})
