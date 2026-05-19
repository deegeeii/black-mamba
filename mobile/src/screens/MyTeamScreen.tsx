// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useEffect, useState, useMemo } from 'react'
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API = process.env.EXPO_PUBLIC_API_URL
const CURRENT_WEEK = 1
const SLOTS = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'BN']
const POSITIONS = ['', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

// ── TYPES ──────────────────────────────────────────────────────────────────────
type Player = { player_id: string; name: string; position: string; nfl_team: string | null }
type FreeAgent = { id: string; name: string; position: string; nfl_team: string | null }
type Trade = {
    id: string
    proposer_id: string
    opponent_id: string
    offer_player_ids: string[]
    request_player_ids: string[]
    status: string
    week: number
}
type Tab = 'roster' | 'free-agents' | 'trades' | 'draft'

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function MyTeamScreen() {

    // ── Context ───────────────────────────────────────────────────────────────
    const navigation = useNavigation()
    const { session, user } = useAuth()
    const { theme } = useTheme()
    const { activeLeague } = useLeague()

    // ── State: General ────────────────────────────────────────────────────────
    const [tab, setTab] = useState<Tab>('roster')
    const [loading, setLoading] = useState(true)

    // ── State: Roster ─────────────────────────────────────────────────────────
    const [roster, setRoster] = useState<Player[]>([])
    const [lineup, setLineup] = useState<Record<string, string>>({})
    const [dropping, setDropping] = useState<string | null>(null)
    const [lineupSaved, setLineupSaved] = useState(false)
    const [addError, setAddError] = useState('')
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

    // ── State: Free Agents ────────────────────────────────────────────────────
    const [freeAgents, setFreeAgents] = useState<FreeAgent[]>([])
    const [position, setPosition] = useState('')

    // ── State: Trades ─────────────────────────────────────────────────────────
    const [trades, setTrades] = useState<Trade[]>([])
    const [allPlayers, setAllPlayers] = useState<Record<string, FreeAgent>>({})

    // ── Headers ───────────────────────────────────────────────────────────────
    const headers = useMemo(() => ({
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
    }), [session?.access_token])

    // ── Fetch Helpers ─────────────────────────────────────────────────────────
    const fetchRoster = () =>
        fetch(`${API}/leagues/${activeLeague!.id}/roster`, { headers })
            .then(r => r.json()).then(d => setRoster(Array.isArray(d) ? d : []))

    const fetchFreeAgents = () =>
        fetch(`${API}/leagues/${activeLeague!.id}/free-agents${position ? `?position=${position}` : ''}`, { headers })
            .then(r => r.json()).then(d => setFreeAgents(Array.isArray(d) ? d : []))

    const fetchTrades = () =>
        fetch(`${API}/leagues/${activeLeague!.id}/trades`, { headers })
            .then(r => r.json()).then(d => setTrades(Array.isArray(d) ? d : []))

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!activeLeague || !session) return
        Promise.allSettled([
            fetch(`${API}/leagues/${activeLeague.id}/roster`, { headers }).then(r => r.json()),
            fetch(`${API}/leagues/${activeLeague.id}/lineup?week=${CURRENT_WEEK}`, { headers }).then(r => r.json()),
            fetch(`${API}/leagues/${activeLeague.id}/free-agents`, { headers }).then(r => r.json()),
            fetch(`${API}/leagues/${activeLeague.id}/trades`, { headers }).then(r => r.json()),
            fetch(`${API}/draft/players`, { headers }).then(r => r.json()),
        ]).then(([r, l, fa, t, p]) => {
            if (r.status === 'fulfilled') setRoster(r.value)
            if (l.status === 'fulfilled') {
                const slots: Record<string, string> = {}
                l.value.forEach((s: any) => { slots[s.slot] = s.player_id })
                setLineup(slots)
            }
            if (fa.status === 'fulfilled') setFreeAgents(fa.value)
            if (t.status === 'fulfilled') setTrades(t.value)
            if (p.status === 'fulfilled') {
                const map: Record<string, FreeAgent> = {}
                p.value.forEach((pl: FreeAgent) => { map[pl.id] = pl })
                setAllPlayers(map)
            }
            setLoading(false)
        })
    }, [activeLeague?.id, session])

    useEffect(() => { if (activeLeague && session) fetchFreeAgents() }, [position])

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleDrop = async (playerId: string) => {
        await fetch(`${API}/leagues/${activeLeague!.id}/roster/drop`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ player_id: playerId, week: CURRENT_WEEK }),
        })
        setDropping(null)
        fetchRoster()
    }

    const handleAdd = async (playerId: string) => {
        setAddError('')
        const res = await fetch(`${API}/leagues/${activeLeague!.id}/roster/add`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ player_id: playerId, drop_player_id: null, week: CURRENT_WEEK }),
        })
        const data = await res.json()
        if (!res.ok) { setAddError(data.detail || 'Failed to add player'); return }
        fetchRoster()
        fetchFreeAgents()
    }

    const handleRespondTrade = async (tradeId: string, action: string) => {
        await fetch(`${API}/leagues/${activeLeague!.id}/trades/${tradeId}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ action }),
        })
        fetchTrades()
        fetchRoster()
    }

    const handleSaveLineup = async () => {
        const slots = Object.fromEntries(
            Object.entries(lineup).filter(([_, id]) => id)
        )
        await fetch(`${API}/leagues/${activeLeague!.id}/lineup`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ week: CURRENT_WEEK, slots }),
        })
        setLineupSaved(true)
        setTimeout(() => setLineupSaved(false), 2000)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    const playerName = (id: string) => allPlayers[id]?.name || id.slice(0, 8)

    const eligibleForSlot = (slot: string) => {
        if (slot === 'FLEX') return roster.filter(p => ['RB', 'WR', 'TE'].includes(p.position))
        if (slot === 'BN') return roster
        return roster.filter(p => p.position === slot)
    }

    const incoming = trades.filter(t => t.opponent_id === user?.id && t.status === 'pending')
    const outgoing = trades.filter(t => t.proposer_id === user?.id && t.status === 'pending')
    const history = trades.filter(t => t.status !== 'pending')

    const tabStyle = (t: Tab) => ({
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center' as const,
        borderBottomWidth: 2,
        borderBottomColor: tab === t ? theme.accent : 'transparent',
    })

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>

            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>My Team</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* ── Tab Bar ── */}
            <View style={[styles.tabs, { borderBottomColor: theme.borderSubtle }]}>
                {(['roster', 'free-agents', 'trades', 'draft'] as Tab[]).map(t => (
                    <TouchableOpacity key={t} style={tabStyle(t)} onPress={() => {
                        if (t === 'draft') { navigation.navigate('Draft' as never); return }
                        setTab(t)
                    }}>
                        <Text style={{
                            color: tab === t ? theme.accent : theme.textDim,
                            fontSize: 13,
                            fontWeight: tab === t ? 'bold' : 'normal',
                        }}>
                            {t === 'free-agents' ? 'Free Agents' : t.charAt(0).toUpperCase() + t.slice(1)}
                            {t === 'trades' && incoming.length > 0 ? ` (${incoming.length})` : ''}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : (
                <>
                    {/* ── Roster Tab ── */}
                    {tab === 'roster' && (
                        <ScrollView contentContainerStyle={styles.list}>
                            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>LINEUP — WEEK {CURRENT_WEEK}</Text>
                            {SLOTS.map(slot => {
                                const playerId = lineup[slot]
                                const player = roster.find(p => p.player_id === playerId)
                                return (
                                    <TouchableOpacity
                                        key={slot}
                                        onPress={() => setSelectedSlot(slot)}
                                        style={[styles.slotRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                                    >
                                        <Text style={[styles.slotLabel, { color: theme.accent }]}>{slot}</Text>
                                        <Text style={{ color: player ? theme.text : theme.textDim, flex: 1, fontSize: 14 }}>
                                            {player ? `${player.name} · ${player.position}` : 'Tap to set'}
                                        </Text>
                                        <Text style={{ color: theme.textDim, fontSize: 12 }}>›</Text>
                                    </TouchableOpacity>
                                )
                            })}

                            <TouchableOpacity
                                style={[styles.saveBtn, { backgroundColor: lineupSaved ? theme.accentDark : theme.accent }]}
                                onPress={handleSaveLineup}
                            >
                                <Text style={{ color: lineupSaved ? theme.accent : '#000', fontWeight: 'bold' }}>
                                    {lineupSaved ? 'Saved ✓' : 'Save Lineup'}
                                </Text>
                            </TouchableOpacity>

                            <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 24 }]}>STARTERS</Text>
                            {roster
                                .filter(p => Object.entries(lineup).some(([slot, id]) => id === p.player_id && slot !== 'BN'))
                                .map(p => (
                                    <View key={p.player_id} style={[styles.playerRow, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: theme.text, fontSize: 14, fontWeight: 'bold' }}>{p.name}</Text>
                                            <Text style={{ color: theme.textDim, fontSize: 12 }}>{p.position} · {p.nfl_team || 'FA'}</Text>
                                        </View>
                                    </View>
                                ))}

                            <Text style={[styles.sectionLabel, { color: theme.textMuted, marginTop: 16 }]}>BENCH</Text>
                            {roster
                                .filter(p => !Object.entries(lineup).some(([slot, id]) => id === p.player_id && slot !== 'BN'))
                                .map(p => (
                                    <View key={p.player_id} style={[styles.playerRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: theme.text, fontSize: 14, fontWeight: 'bold' }}>{p.name}</Text>
                                            <Text style={{ color: theme.textDim, fontSize: 12 }}>{p.position} · {p.nfl_team || 'FA'}</Text>
                                        </View>
                                        {dropping === p.player_id ? (
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                <TouchableOpacity
                                                    onPress={() => handleDrop(p.player_id)}
                                                    style={[styles.smallBtn, { backgroundColor: theme.danger }]}
                                                >
                                                    <Text style={{ color: '#fff', fontSize: 12 }}>Confirm</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => setDropping(null)}
                                                    style={[styles.smallBtn, { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1 }]}
                                                >
                                                    <Text style={{ color: theme.textMuted, fontSize: 12 }}>Cancel</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                onPress={() => setDropping(p.player_id)}
                                                style={[styles.smallBtn, { borderColor: theme.danger, borderWidth: 1 }]}
                                            >
                                                <Text style={{ color: theme.danger, fontSize: 12 }}>Drop</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                ))}
                        </ScrollView>
                    )}

                    {/* ── Free Agents Tab ── */}
                    {tab === 'free-agents' && (
                        <View style={{ flex: 1 }}>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                style={styles.filterRow}
                                contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
                            >
                                {addError ? <Text style={{ color: theme.danger, padding: 16, fontSize: 13 }}>{addError}</Text> : null}
                                {POSITIONS.map(pos => (
                                    <TouchableOpacity
                                        key={pos}
                                        style={[styles.filterBtn, {
                                            backgroundColor: position === pos ? theme.accent : theme.bgCard,
                                            borderColor: position === pos ? theme.accent : theme.border,
                                        }]}
                                        onPress={() => setPosition(pos)}
                                    >
                                        <Text style={{ color: position === pos ? '#000' : theme.textMuted, fontSize: 12 }}>
                                            {pos || 'ALL'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <FlatList
                                data={freeAgents}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.list}
                                renderItem={({ item }) => (
                                    <View style={[styles.playerRow, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: theme.text, fontSize: 14, fontWeight: 'bold' }}>{item.name}</Text>
                                            <Text style={{ color: theme.textDim, fontSize: 12 }}>{item.position} · {item.nfl_team || 'FA'}</Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => handleAdd(item.id)}
                                            style={[styles.smallBtn, { backgroundColor: theme.accent }]}
                                        >
                                            <Text style={{ color: '#000', fontSize: 12, fontWeight: 'bold' }}>Add</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            />
                        </View>
                    )}

                    {/* ── Trades Tab ── */}
                    {tab === 'trades' && (
                        <ScrollView contentContainerStyle={styles.list}>
                            {incoming.length > 0 && (
                                <>
                                    <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>INCOMING</Text>
                                    {incoming.map(t => (
                                        <View key={t.id} style={[styles.tradeCard, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}>
                                            <Text style={{ color: theme.textDim, fontSize: 12, marginBottom: 8 }}>Week {t.week}</Text>
                                            <Text style={{ color: theme.text, fontSize: 13, marginBottom: 4 }}>
                                                They offer: {t.offer_player_ids.map(playerName).join(', ')}
                                            </Text>
                                            <Text style={{ color: theme.text, fontSize: 13, marginBottom: 12 }}>
                                                They want: {t.request_player_ids.map(playerName).join(', ')}
                                            </Text>
                                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                                <TouchableOpacity
                                                    onPress={() => handleRespondTrade(t.id, 'accept')}
                                                    style={[styles.smallBtn, { backgroundColor: theme.accent, flex: 1 }]}
                                                >
                                                    <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 13 }}>Accept</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    onPress={() => handleRespondTrade(t.id, 'reject')}
                                                    style={[styles.smallBtn, { borderColor: theme.danger, borderWidth: 1, flex: 1 }]}
                                                >
                                                    <Text style={{ color: theme.danger, fontSize: 13 }}>Reject</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ))}
                                </>
                            )}

                            {outgoing.length > 0 && (
                                <>
                                    <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>OUTGOING</Text>
                                    {outgoing.map(t => (
                                        <View key={t.id} style={[styles.tradeCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                            <Text style={{ color: theme.textDim, fontSize: 12, marginBottom: 8 }}>Week {t.week} · Pending</Text>
                                            <Text style={{ color: theme.text, fontSize: 13, marginBottom: 4 }}>
                                                Offering: {t.offer_player_ids.map(playerName).join(', ')}
                                            </Text>
                                            <Text style={{ color: theme.text, fontSize: 13, marginBottom: 12 }}>
                                                Requesting: {t.request_player_ids.map(playerName).join(', ')}
                                            </Text>
                                            <TouchableOpacity
                                                onPress={() => handleRespondTrade(t.id, 'cancel')}
                                                style={[styles.smallBtn, { borderColor: theme.border, borderWidth: 1 }]}
                                            >
                                                <Text style={{ color: theme.textMuted, fontSize: 13 }}>Cancel</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </>
                            )}

                            {history.length > 0 && (
                                <>
                                    <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>HISTORY</Text>
                                    {history.map(t => (
                                        <View key={t.id} style={[styles.tradeCard, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                            <Text style={{ color: theme.textDim, fontSize: 12 }}>
                                                Week {t.week} · {t.status.toUpperCase()}
                                            </Text>
                                        </View>
                                    ))}
                                </>
                            )}

                            {incoming.length === 0 && outgoing.length === 0 && history.length === 0 && (
                                <Text style={{ color: theme.textDim, textAlign: 'center', marginTop: 40, fontSize: 14 }}>
                                    No trades yet
                                </Text>
                            )}
                        </ScrollView>
                    )}
                </>
            )}

            {/* ── Slot Picker Sheet ── */}
            {selectedSlot && (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }]}>
                    <View style={{ backgroundColor: theme.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' }}>
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: 16,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.borderSubtle,
                        }}>
                            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 16 }}>Set {selectedSlot}</Text>
                            <TouchableOpacity onPress={() => setSelectedSlot(null)}>
                                <Text style={{ color: theme.textDim }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={eligibleForSlot(selectedSlot)}
                            keyExtractor={p => p.player_id}
                            contentContainerStyle={{ padding: 12, gap: 8 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.playerRow, {
                                        backgroundColor: lineup[selectedSlot] === item.player_id ? theme.accentDark : theme.bg,
                                        borderColor: lineup[selectedSlot] === item.player_id ? theme.accent : theme.border,
                                    }]}
                                    onPress={() => {
                                        setLineup(prev => ({ ...prev, [selectedSlot]: item.player_id }))
                                        setSelectedSlot(null)
                                        setLineupSaved(false)
                                    }}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: theme.text, fontSize: 14, fontWeight: 'bold' }}>{item.name}</Text>
                                        <Text style={{ color: theme.textDim, fontSize: 12 }}>{item.position} · {item.nfl_team || 'FA'}</Text>
                                    </View>
                                    {lineup[selectedSlot] === item.player_id && (
                                        <Text style={{ color: theme.accent }}>✓</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
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
        fontSize: 17,
        fontWeight: 'bold',
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    list: {
        padding: 16,
        gap: 8,
    },
    sectionLabel: {
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 4,
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        gap: 12,
    },
    slotLabel: {
        width: 40,
        fontSize: 12,
        fontWeight: 'bold',
    },
    saveBtn: {
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 8,
        borderWidth: 1,
        gap: 12,
    },
    smallBtn: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 6,
        alignItems: 'center',
    },
    filterRow: {
        paddingVertical: 12,
    },
    filterBtn: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    tradeCard: {
        padding: 16,
        borderRadius: 10,
        borderWidth: 1,
        marginBottom: 4,
    },
})
