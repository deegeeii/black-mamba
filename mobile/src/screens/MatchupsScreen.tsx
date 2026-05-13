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
    home_team_name: string
    away_team_name: string
    home_score: number
    away_score: number
    week: number
    is_complete: boolean
}

export default function MatchupsScreen() {
    const navigation = useNavigation()
    const { session, user } = useAuth()
    const { theme } = useTheme()
    const { activeLeague } = useLeague()

    const [matchups, setMatchups] = useState<Matchup[]>([])
    const [week, setWeek] = useState(CURRENT_WEEK)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!activeLeague || !session) return
        setLoading(true)
        fetch(`${API}/leagues/${activeLeague.id}/matchups?week=${week}`, {
            headers: { Authorization: `Bearer ${session.access_token}` }
        })
            .then(r => r.json())
            .then(data => { setMatchups(Array.isArray(data) ? data : []); setLoading(false) })
            .catch(() => setLoading(false))
    }, [activeLeague?.id, session, week])

    const isMyMatchup = (m: Matchup) =>
        m.home_user_id === user?.id || m.away_user_id === user?.id

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Matchups</Text>
                <View style={{ width: 60 }} />
            </View>

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
                        const homeWon = item.is_complete && item.home_score > item.away_score
                        const awayWon = item.is_complete && item.away_score > item.home_score

                        return (
                            <View style={[
                                styles.card,
                                {
                                    backgroundColor: theme.bgCard,
                                    borderColor: isMine ? theme.accent : theme.border,
                                    borderWidth: isMine ? 1.5 : 1,
                                }
                            ]}>
                                {isMine && (
                                    <Text style={[styles.myTag, { color: theme.accent }]}>YOUR MATCHUP</Text>
                                )}
                                <View style={styles.matchRow}>
                                    <View style={styles.teamCol}>
                                        <Text style={[styles.teamName, { color: homeWon ? theme.accent : theme.text }]} numberOfLines={1}>
                                            {item.home_team_name || 'Home'}
                                        </Text>
                                        <Text style={[styles.score, { color: homeWon ? theme.accent : theme.textMuted }]}>
                                            {item.home_score?.toFixed(1) ?? '—'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.vs, { color: theme.textDim }]}>vs</Text>
                                    <View style={[styles.teamCol, styles.teamColRight]}>
                                        <Text style={[styles.teamName, { color: awayWon ? theme.accent : theme.text }]} numberOfLines={1}>
                                            {item.away_team_name || 'Away'}
                                        </Text>
                                        <Text style={[styles.score, { color: awayWon ? theme.accent : theme.textMuted }]}>
                                            {item.away_score?.toFixed(1) ?? '—'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={[styles.status, { color: theme.textDim }]}>
                                    {item.is_complete ? 'Final' : 'In Progress'}
                                </Text>
                            </View>
                        )
                    }}
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
    title: {
        fontSize: 17,
        fontWeight: 'bold',
    },
    weekRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    list: {
        padding: 16,
        gap: 12,
    },
    card: {
        borderRadius: 10,
        padding: 16,
    },
    myTag: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 8,
    },
    matchRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    teamCol: {
        flex: 1,
    },
    teamColRight: {
        alignItems: 'flex-end',
    },
    teamName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    score: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    vs: {
        fontSize: 12,
        paddingHorizontal: 12,
    },
    status: {
        fontSize: 11,
        marginTop: 10,
        textAlign: 'center',
    },
    empty: {
        textAlign: 'center',
        marginTop: 60,
        fontSize: 14,
    },
})
