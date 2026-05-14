import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const API = process.env.EXPO_PUBLIC_API_URL

type Matchup = {
    id: string
    round: number
    home_team_name: string
    away_team_name: string
    home_score: number
    away_score: number
    winner_team_name: string | null
}

type Entity = {
    id: string
    name: string
    entity_type: string
    price: number
    picked_by: string | null
}


export default function TournamentDetailScreen() {
    const navigation = useNavigation()
    const route = useRoute<any>()
    const { tournament } = route.params
    const { session, user } = useAuth()
    const { theme } = useTheme()

    const [matchups, setMatchups] = useState<Matchup[]>([])
    const [loading, setLoading] = useState(true)
    const [joining, setJoining] = useState(false)
    const [entities, setEntities] = useState<Entity[]>([])
    const [generatingDraft, setGeneratingDraft] = useState(false)
    const [picking, setPicking] = useState<string | null>(null)


    const headers = { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }

    useEffect(() => {
        Promise.allSettled([
            fetch(`${API}/leagues/tournaments/${tournament.id}/matchups`, { headers }).then(r => r.json()),
            fetch(`${API}/leagues/tournaments/${tournament.id}/draft/entities`, { headers }).then(r => r.json()),
        ]).then(([matchupsRes, entitiesRes]) => {
            if (matchupsRes.status === 'fulfilled') setMatchups(Array.isArray(matchupsRes.value) ? matchupsRes.value : [])
            if (entitiesRes.status === 'fulfilled') setEntities(Array.isArray(entitiesRes.value) ? entitiesRes.value : [])
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [tournament.id])
    

    const handleJoin = async () => {
        setJoining(true)
        try {
            const res = await fetch(`${API}/tournaments/${tournament.id}/join`, { method: 'POST', headers })
            const data = await res.json()
            if (!res.ok) {
                Alert.alert('Error', data.detail || 'Could not join tournament')
            } else {
                Alert.alert('Joined!', 'You are in the tournament.')
            }
        } catch {
            Alert.alert('Error', 'Network error')
        }
        setJoining(false)
    }

    const fetchEntities = async () => {
        try {
            const res = await fetch(`${API}/leagues/tournaments/${tournament.id}/draft/entities`, { headers })
            const data = await res.json()
            setEntities(Array.isArray(data) ? data : [])
        } catch {}
    }
    
    const handleGenerateDraft = async () => {
        setGeneratingDraft(true)
        await fetch(`${API}/leagues/tournaments/${tournament.id}/draft/generate`, { method: 'POST', headers })
        setGeneratingDraft(false)
        fetchEntities()
    }
    
    const handlePick = async (entityId: string) => {
        setPicking(entityId)
        const res = await fetch(`${API}/leagues/tournaments/${tournament.id}/draft/pick/${entityId}`, { method: 'POST', headers })
        if (!res.ok) {
            const data = await res.json()
            Alert.alert('Error', data.detail || 'Pick failed')
        }
        setPicking(null)
        fetchEntities()
    }
    

    const byRound = matchups.reduce<Record<number, Matchup[]>>((acc, m) => {
        if (!acc[m.round]) acc[m.round] = []
        acc[m.round].push(m)
        return acc
    }, {})

    const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b)

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>{tournament.name}</Text>
                <View style={{ width: 60 }} />
            </View>

            <View style={[styles.meta, { borderBottomColor: theme.borderSubtle }]}>
                <Text style={[styles.sport, { color: theme.textDim }]}>{tournament.sport}</Text>
                <Text style={[styles.teams, { color: theme.textMuted }]}>
                    {tournament.participant_count ?? 0}/{tournament.max_participants} teams
                </Text>
                {tournament.status === 'open' && (
                    <TouchableOpacity
                        style={[styles.joinBtn, { backgroundColor: theme.accent }]}
                        onPress={handleJoin}
                        disabled={joining}
                    >
                        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 13 }}>
                            {joining ? 'Joining...' : 'Join'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : matchups.length === 0 ? (
                <Text style={[styles.empty, { color: theme.textDim }]}>Bracket not generated yet</Text>
            ) : (
                <FlatList
                    data={rounds}
                    keyExtractor={r => String(r)}
                    contentContainerStyle={styles.list}
                    renderItem={({ item: round }) => (
                        <View>
                            <Text style={[styles.roundLabel, { color: theme.textMuted }]}>Round {round}</Text>
                            {byRound[round].map(m => {
                                const homeWon = !!m.winner_team_name && m.winner_team_name === m.home_team_name
                                const awayWon = !!m.winner_team_name && m.winner_team_name === m.away_team_name
                                return (
                                    <View key={m.id} style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                        <View style={styles.matchRow}>
                                            <View style={styles.teamCol}>
                                                <Text style={[styles.teamName, { color: homeWon ? theme.accent : theme.text }]} numberOfLines={1}>
                                                    {m.home_team_name || 'TBD'}
                                                </Text>
                                                <Text style={[styles.score, { color: homeWon ? theme.accent : theme.textMuted }]}>
                                                    {m.home_score?.toFixed(1) ?? '—'}
                                                </Text>
                                            </View>
                                            <Text style={[styles.vs, { color: theme.textDim }]}>vs</Text>
                                            <View style={[styles.teamCol, styles.teamColRight]}>
                                                <Text style={[styles.teamName, { color: awayWon ? theme.accent : theme.text }]} numberOfLines={1}>
                                                    {m.away_team_name || 'TBD'}
                                                </Text>
                                                <Text style={[styles.score, { color: awayWon ? theme.accent : theme.textMuted }]}>
                                                    {m.away_score?.toFixed(1) ?? '—'}
                                                </Text>
                                            </View>
                                        </View>
                                        {m.winner_team_name && (
                                            <Text style={[styles.winner, { color: theme.accent }]}>
                                                Winner: {m.winner_team_name}
                                            </Text>
                                        )}
                                    </View>
                                )
                            })}
                        </View>
                    )}
                    ListFooterComponent={() => {
                        const myPicks = entities.filter(e => e.picked_by === user?.id)
                        const spent = myPicks.reduce((s, e) => s + e.price, 0)
                        const budget = tournament.draft_budget || 50000
                        const remaining = budget - spent
                        return (
                            <View style={{ marginTop: 24, paddingBottom: 40 }}>
                                <View style={styles.draftHeader}>
                                    <Text style={[styles.roundLabel, { color: theme.textMuted }]}>DRAFT ROOM</Text>
                                    {entities.length === 0 && (
                                        <TouchableOpacity onPress={handleGenerateDraft} disabled={generatingDraft}
                                            style={[styles.genBtn, { backgroundColor: generatingDraft ? theme.border : theme.accent }]}>
                                            <Text style={{ color: generatingDraft ? theme.textDim : '#000', fontWeight: 'bold', fontSize: 12 }}>
                                                {generatingDraft ? 'Generating...' : 'Generate Pool'}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                {entities.length > 0 && (
                                    <>
                                        <View style={[styles.budgetBar, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                            {[
                                                { label: 'BUDGET', value: `$${budget.toLocaleString()}`, color: theme.text },
                                                { label: 'SPENT', value: `$${spent.toLocaleString()}`, color: theme.text },
                                                { label: 'LEFT', value: `$${remaining.toLocaleString()}`, color: remaining >= 0 ? theme.accent : theme.danger },
                                                { label: 'PICKS', value: String(myPicks.length), color: theme.text },
                                            ].map(({ label, value, color }) => (
                                                <View key={label} style={styles.budgetItem}>
                                                    <Text style={{ color: theme.textDim, fontSize: 10, letterSpacing: 1 }}>{label}</Text>
                                                    <Text style={{ color, fontWeight: 'bold', fontSize: 14 }}>{value}</Text>
                                                </View>
                                            ))}
                                        </View>
                                        {entities.map(e => (
                                            <View key={e.id} style={[styles.entityCard, { backgroundColor: theme.bgCard, borderColor: e.picked_by === user?.id ? theme.accent : theme.border }]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={[styles.entityName, { color: theme.text }]}>{e.name}</Text>
                                                    <Text style={{ color: theme.textDim, fontSize: 11, textTransform: 'capitalize' }}>{e.entity_type}</Text>
                                                </View>
                                                <Text style={[styles.entityPrice, { color: theme.accent }]}>${e.price.toLocaleString()}</Text>
                                                {e.picked_by ? (
                                                    <Text style={{ color: e.picked_by === user?.id ? theme.accent : theme.textDim, fontSize: 12, marginLeft: 12 }}>
                                                        {e.picked_by === user?.id ? 'Yours' : 'Taken'}
                                                    </Text>
                                                ) : (
                                                    <TouchableOpacity onPress={() => handlePick(e.id)} disabled={picking === e.id}
                                                        style={[styles.pickBtn, { backgroundColor: theme.accent, opacity: picking === e.id ? 0.5 : 1 }]}>
                                                        <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12 }}>
                                                            {picking === e.id ? '...' : 'Pick'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        ))}
                                    </>
                                )}
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
    title: { fontSize: 17, fontWeight: 'bold', flex: 1, textAlign: 'center' },
    meta: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: 1,
    },
    sport: { fontSize: 13, flex: 1 },
    teams: { fontSize: 12 },
    joinBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    list: { padding: 16, gap: 12 },
    roundLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    card: { borderRadius: 10, borderWidth: 1, padding: 16, marginBottom: 10 },
    matchRow: { flexDirection: 'row', alignItems: 'center' },
    teamCol: { flex: 1 },
    teamColRight: { alignItems: 'flex-end' },
    teamName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
    score: { fontSize: 22, fontWeight: 'bold' },
    vs: { fontSize: 12, paddingHorizontal: 12 },
    winner: { fontSize: 11, marginTop: 10, textAlign: 'center' },
    empty: { textAlign: 'center', marginTop: 60, fontSize: 14 },
    draftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    genBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    budgetBar: { flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
    budgetItem: { alignItems: 'center', gap: 4 },
    entityCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 8 },
    entityName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
    entityPrice: { fontWeight: 'bold', fontSize: 14, marginLeft: 12 },
    pickBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, marginLeft: 12 },

})
