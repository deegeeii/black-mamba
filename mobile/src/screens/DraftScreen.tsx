import { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'
import { supabase } from '../lib/supabase'

const API = process.env.EXPO_PUBLIC_API_URL

type Player = { id: string; name: string; team: string; position: string }
type Pick = { id: string; user_id: string; player_id: string; round: number; pick_number: number }
type DraftSession = {
    id: string
    status: string
    draft_order: string[]
    current_pick: number
    total_rounds: number
}

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE']

export default function DraftScreen() {
    const navigation = useNavigation()
    const { session, user } = useAuth()
    const { theme } = useTheme()
    const { activeLeague } = useLeague()

    const [draftSession, setDraftSession] = useState<DraftSession | null>(null)
    const [players, setPlayers] = useState<Player[]>([])
    const [picks, setPicks] = useState<Pick[]>([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'available' | 'picks'>('available')
    const [posFilter, setPosFilter] = useState('ALL')
    const [picking, setPicking] = useState(false)
    const [starting, setStarting] = useState(false)

    const headers = { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }

    const fetchAll = async () => {
        if (!activeLeague || !session) return
        const [sessionRes, playersRes, picksRes] = await Promise.allSettled([
            fetch(`${API}/draft/${activeLeague.id}/session`, { headers }).then(r => r.json()),
            fetch(`${API}/draft/players`, { headers }).then(r => r.json()),
            fetch(`${API}/draft/${activeLeague.id}/picks`, { headers }).then(r => r.json()),
        ])
        if (sessionRes.status === 'fulfilled' && !sessionRes.value.detail) setDraftSession(sessionRes.value)
        if (playersRes.status === 'fulfilled' && Array.isArray(playersRes.value)) setPlayers(playersRes.value)
        if (picksRes.status === 'fulfilled' && Array.isArray(picksRes.value)) setPicks(picksRes.value)
        setLoading(false)
    }

    useEffect(() => { fetchAll() }, [activeLeague?.id, session])

    useEffect(() => {
        if (!activeLeague) return
        const channel = supabase
            .channel(`draft:${activeLeague.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'draft_picks',
                filter: `league_id=eq.${activeLeague.id}`,
            }, () => { fetchAll() })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [activeLeague?.id])

    const pickedIds = useMemo(() => new Set(picks.map(p => p.player_id)), [picks])

    const availablePlayers = useMemo(() =>
        players.filter(p => !pickedIds.has(p.id) && (posFilter === 'ALL' || p.position === posFilter)),
        [players, pickedIds, posFilter]
    )

    const playerMap = useMemo(() => {
        const m: Record<string, Player> = {}
        players.forEach(p => { m[p.id] = p })
        return m
    }, [players])

    const isMyTurn = useMemo(() => {
        if (!draftSession || draftSession.status !== 'active' || !user) return false
        const { draft_order, current_pick } = draftSession
        const n = draft_order.length
        const idx = current_pick - 1
        const round = Math.floor(idx / n)
        const pos = round % 2 === 0 ? idx % n : n - 1 - (idx % n)
        return draft_order[pos] === user.id
    }, [draftSession, user])

    const currentRound = draftSession
        ? Math.floor((draftSession.current_pick - 1) / (draftSession.draft_order.length || 1)) + 1
        : 1

    const handlePick = async (player: Player) => {
        if (!isMyTurn || !activeLeague) return
        setPicking(true)
        try {
            const res = await fetch(`${API}/draft/${activeLeague.id}/pick`, {
                method: 'POST', headers,
                body: JSON.stringify({ player_id: player.id }),
            })
            const data = await res.json()
            if (!res.ok) Alert.alert('Error', data.detail || 'Could not make pick')
        } catch { Alert.alert('Error', 'Network error') }
        setPicking(false)
    }

    const handleStart = async () => {
        if (!activeLeague) return
        setStarting(true)
        try {
            const res = await fetch(`${API}/draft/${activeLeague.id}/start`, { method: 'POST', headers })
            const data = await res.json()
            if (!res.ok) Alert.alert('Error', data.detail || 'Could not start draft')
            else fetchAll()
        } catch { Alert.alert('Error', 'Network error') }
        setStarting(false)
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Draft</Text>
                <View style={{ width: 60 }} />
            </View>

            {loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : (
                <>
                    {!draftSession || draftSession.status === 'pending' ? (
                        <View style={styles.startBox}>
                            <Text style={[styles.statusText, { color: theme.textDim }]}>Draft has not started yet</Text>
                            <TouchableOpacity
                                style={[styles.startBtn, { backgroundColor: theme.accent }]}
                                onPress={handleStart}
                                disabled={starting}
                            >
                                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 15 }}>
                                    {starting ? 'Starting...' : 'Start Draft'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : draftSession.status === 'completed' ? (
                        <View style={styles.startBox}>
                            <Text style={[styles.statusText, { color: theme.accent }]}>Draft Complete</Text>
                        </View>
                    ) : (
                        <View style={[styles.statusBar, { backgroundColor: theme.bgCard, borderBottomColor: theme.borderSubtle }]}>
                            <Text style={[styles.roundText, { color: theme.textMuted }]}>
                                Round {currentRound} · Pick {draftSession.current_pick}
                            </Text>
                            <Text style={[styles.turnText, { color: isMyTurn ? theme.accent : theme.textDim }]}>
                                {isMyTurn ? '⚡ Your turn!' : 'Waiting for pick...'}
                            </Text>
                        </View>
                    )}

                    <View style={[styles.tabRow, { borderBottomColor: theme.borderSubtle }]}>
                        {(['available', 'picks'] as const).map(t => (
                            <TouchableOpacity
                                key={t}
                                style={[styles.tab, tab === t && { borderBottomColor: theme.accent, borderBottomWidth: 2 }]}
                                onPress={() => setTab(t)}
                            >
                                <Text style={{ color: tab === t ? theme.accent : theme.textDim, fontWeight: tab === t ? 'bold' : 'normal', fontSize: 14 }}>
                                    {t === 'available' ? 'Available' : `Picks (${picks.length})`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {tab === 'available' ? (
                        <>
                            <View style={styles.pillRow}>
                                {POSITIONS.map(pos => (
                                    <TouchableOpacity
                                        key={pos}
                                        style={[styles.pill, {
                                            backgroundColor: posFilter === pos ? theme.accent : theme.bgCard,
                                            borderColor: posFilter === pos ? theme.accent : theme.border,
                                        }]}
                                        onPress={() => setPosFilter(pos)}
                                    >
                                        <Text style={{ color: posFilter === pos ? '#000' : theme.textMuted, fontSize: 12 }}>{pos}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <FlatList
                                data={availablePlayers}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.list}
                                renderItem={({ item }) => (
                                    <View style={[styles.playerRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                        <View style={styles.playerInfo}>
                                            <Text style={[styles.playerName, { color: theme.text }]}>{item.name}</Text>
                                            <Text style={[styles.playerMeta, { color: theme.textDim }]}>{item.team} · {item.position}</Text>
                                        </View>
                                        {isMyTurn && (
                                            <TouchableOpacity
                                                style={[styles.pickBtn, { backgroundColor: theme.accent }]}
                                                onPress={() => handlePick(item)}
                                                disabled={picking}
                                            >
                                                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 13 }}>
                                                    {picking ? '...' : 'Draft'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}
                            />
                        </>
                    ) : (
                        <FlatList
                            data={[...picks].reverse()}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.list}
                            renderItem={({ item }) => {
                                const player = playerMap[item.player_id]
                                const isMe = item.user_id === user?.id
                                return (
                                    <View style={[styles.pickRow, { backgroundColor: theme.bgCard, borderColor: isMe ? theme.accent : theme.border, borderWidth: isMe ? 1.5 : 1 }]}>
                                        <View style={[styles.pickNum, { backgroundColor: isMe ? theme.accent : theme.bgDeep }]}>
                                            <Text style={{ color: isMe ? '#000' : theme.textDim, fontSize: 12, fontWeight: 'bold' }}>
                                                #{item.pick_number}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.playerName, { color: theme.text }]}>
                                                {player?.name ?? item.player_id}
                                            </Text>
                                            <Text style={[styles.playerMeta, { color: theme.textDim }]}>
                                                {player?.position} · {player?.team} · Rd {item.round}
                                            </Text>
                                        </View>
                                        {isMe && <Text style={{ color: theme.accent, fontSize: 11, fontWeight: 'bold' }}>YOU</Text>}
                                    </View>
                                )
                            }}
                        />
                    )}
                </>
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
    startBox: { alignItems: 'center', marginTop: 60, gap: 20 },
    statusText: { fontSize: 15 },
    startBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8 },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    roundText: { fontSize: 13 },
    turnText: { fontSize: 14, fontWeight: 'bold' },
    tabRow: { flexDirection: 'row', borderBottomWidth: 1 },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
    pillRow: { flexDirection: 'row', gap: 8, padding: 16, paddingBottom: 8 },
    pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
    list: { padding: 16, gap: 10 },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        padding: 12,
    },
    playerInfo: { flex: 1 },
    playerName: { fontSize: 14, fontWeight: 'bold' },
    playerMeta: { fontSize: 12, marginTop: 2 },
    pickBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
    pickRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        padding: 12,
        gap: 12,
    },
    pickNum: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bgDeep: {},
})
