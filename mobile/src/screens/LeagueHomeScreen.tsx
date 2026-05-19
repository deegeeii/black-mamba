// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react'
import {
    View,
    Text,
    ScrollView,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    Alert,
} from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API = process.env.EXPO_PUBLIC_API_URL
const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE']

// ── TYPES ──────────────────────────────────────────────────────────────────────
type Tab = 'settings' | 'rosters' | 'history'

interface Player {
    player_id: string
    name: string
    position: string
    nfl_team: string | null
}

interface MemberRoster {
    user_id: string
    team_name: string
    avatar_url: string | null
    roster: Player[]
}

interface Award {
    id: string
    award_name: string
    user_id: string
    team_name: string
}

interface Season {
    season: number
    champion: { user_id: string; team_name: string } | null
    high_scorer: { user_id: string; team_name: string; points: number } | null
    awards: Award[]
}

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function LeagueHomeScreen() {

    // ── Context ───────────────────────────────────────────────────────────────
    const { session, user } = useAuth()
    const { theme } = useTheme()
    const { activeLeague, members } = useLeague()

    // ── State: General ────────────────────────────────────────────────────────
    const [tab, setTab] = useState<Tab>('settings')

    // ── State: Team Settings ──────────────────────────────────────────────────
    const [teamName, setTeamName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [settingsLoading, setSettingsLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // ── State: Rosters ────────────────────────────────────────────────────────
    const [rosters, setRosters] = useState<MemberRoster[]>([])
    const [rostersLoading, setRostersLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)

    // ── State: History ────────────────────────────────────────────────────────
    const [history, setHistory] = useState<Season[]>([])
    const [historyLoading, setHistoryLoading] = useState(true)
    const [newAwardName, setNewAwardName] = useState('')
    const [newAwardUser, setNewAwardUser] = useState('')
    const [newAwardSeason, setNewAwardSeason] = useState(2024)

    // ── Helpers ───────────────────────────────────────────────────────────────
    const isCommissioner = activeLeague?.commissioner_id === user?.id

    const headers = {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
    }

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!session || !activeLeague) return
        Promise.allSettled([
            fetch(`${API}/leagues/${activeLeague.id}/members`, { headers }).then(r => r.json()),
            fetch(`${API}/profile/`, { headers }).then(r => r.json()),
        ]).then(([membersRes, profileRes]) => {
            if (membersRes.status === 'fulfilled') {
                const me = membersRes.value.find((m: any) => m.user_id === user?.id)
                if (me?.team_name) setTeamName(me.team_name)
            }
            if (profileRes.status === 'fulfilled') setAvatarUrl(profileRes.value.avatar_url || '')
            setSettingsLoading(false)
        })
    }, [session, activeLeague?.id])

    useEffect(() => {
        if (!session || !activeLeague) return
        fetch(`${API}/leagues/${activeLeague.id}/rosters`, { headers })
            .then(r => r.json())
            .then(data => { setRosters(data); setRostersLoading(false) })
            .catch(() => setRostersLoading(false))
    }, [session, activeLeague?.id])

    const fetchHistory = () => {
        if (!session || !activeLeague) return
        fetch(`${API}/leagues/${activeLeague.id}/history`, { headers })
            .then(r => r.json())
            .then(data => { setHistory(data); setHistoryLoading(false) })
            .catch(() => setHistoryLoading(false))
    }
    useEffect(() => { fetchHistory() }, [session, activeLeague?.id])

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSaveSettings = async () => {
        setSaving(true)
        try {
            await fetch(`${API}/leagues/${activeLeague?.id}/my-team`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ team_name: teamName, avatar_url: avatarUrl }),
            })
            Alert.alert('Saved!', 'Team settings updated.')
        } catch {
            Alert.alert('Error', 'Something went wrong.')
        } finally {
            setSaving(false)
        }
    }

    const handleAddAward = async () => {
        if (!newAwardName || !newAwardUser) {
            Alert.alert('Missing fields', 'Fill in award name and select a recipient.')
            return
        }
        await fetch(`${API}/leagues/${activeLeague?.id}/history/awards`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                season: newAwardSeason,
                award_name: newAwardName,
                user_id: newAwardUser,
            }),
        })
        setNewAwardName('')
        setNewAwardUser('')
        fetchHistory()
    }

    const handleDeleteAward = async (awardId: string) => {
        await fetch(`${API}/leagues/${activeLeague?.id}/history/awards/${awardId}`, {
            method: 'DELETE',
            headers,
        })
        fetchHistory()
    }

    const sortedRoster = (players: Player[]) =>
        [...players].sort((a, b) =>
            POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position)
        )

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.bg }}
            contentContainerStyle={styles.content}
        >
            {/* ── Page Header ── */}
            <Text style={[styles.title, { color: theme.accent }]}>League</Text>
            <Text style={[styles.subtitle, { color: theme.textDim }]}>{activeLeague?.name}</Text>

            {/* ── Tab Bar ── */}
            <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
                {(['settings', 'rosters', 'history'] as Tab[]).map(t => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => setTab(t)}
                        style={[styles.tabBtn, { borderBottomColor: tab === t ? theme.accent : 'transparent' }]}
                    >
                        <Text style={{
                            color: tab === t ? theme.accent : theme.textDim,
                            fontWeight: tab === t ? 'bold' : 'normal',
                            fontSize: 13,
                        }}>
                            {t === 'settings' ? 'Team Settings' : t === 'rosters' ? 'Rosters' : 'History'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* ── Team Settings Tab ── */}
            {tab === 'settings' && (
                settingsLoading
                    ? <Text style={{ color: theme.textDim, marginTop: 24 }}>Loading...</Text>
                    : (
                        <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                            <Text style={[styles.cardTitle, { color: theme.accent }]}>Team Identity</Text>

                            <Text style={[styles.label, { color: theme.textDim }]}>Team Name</Text>
                            <TextInput
                                value={teamName}
                                onChangeText={setTeamName}
                                placeholder="e.g. The Mambas"
                                placeholderTextColor={theme.textDim}
                                style={[styles.input, { backgroundColor: theme.bgDeep, borderColor: theme.border, color: theme.text }]}
                            />

                            <Text style={[styles.label, { color: theme.textDim, marginTop: 12 }]}>Avatar URL</Text>
                            <TextInput
                                value={avatarUrl}
                                onChangeText={setAvatarUrl}
                                placeholder="https://..."
                                placeholderTextColor={theme.textDim}
                                style={[styles.input, { backgroundColor: theme.bgDeep, borderColor: theme.border, color: theme.text }]}
                            />

                            <TouchableOpacity
                                onPress={handleSaveSettings}
                                disabled={saving}
                                style={[styles.btn, { backgroundColor: theme.accent }]}
                            >
                                <Text style={styles.btnText}>
                                    {saving ? 'Saving...' : 'Save Team Settings'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )
            )}

            {/* ── Rosters Tab ── */}
            {tab === 'rosters' && (
                rostersLoading
                    ? <Text style={{ color: theme.textDim, marginTop: 24 }}>Loading rosters...</Text>
                    : (
                        <FlatList
                            data={rosters}
                            keyExtractor={m => m.user_id}
                            scrollEnabled={false}
                            renderItem={({ item: member }) => (
                                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                    <TouchableOpacity
                                        style={styles.rosterHeader}
                                        onPress={() => setExpanded(expanded === member.user_id ? null : member.user_id)}
                                    >
                                        <View style={[styles.avatar, { backgroundColor: theme.bgDeep }]}>
                                            <Text style={{ color: theme.accent, fontWeight: 'bold' }}>
                                                {member.team_name.charAt(0)}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 15 }}>
                                                {member.team_name}
                                            </Text>
                                            <Text style={{ color: theme.textDim, fontSize: 12 }}>
                                                {member.roster.length} players
                                            </Text>
                                        </View>
                                        <Text style={{ color: theme.textDim, fontSize: 18 }}>
                                            {expanded === member.user_id ? '▲' : '▼'}
                                        </Text>
                                    </TouchableOpacity>

                                    {expanded === member.user_id && (
                                        <View style={{ marginTop: 12 }}>
                                            {POSITION_ORDER.map(pos => {
                                                const players = sortedRoster(member.roster).filter(p => p.position === pos)
                                                if (players.length === 0) return null
                                                return (
                                                    <View key={pos} style={{ marginBottom: 10 }}>
                                                        <Text style={{
                                                            color: theme.textDim,
                                                            fontSize: 11,
                                                            letterSpacing: 1,
                                                            textTransform: 'uppercase',
                                                            marginBottom: 4,
                                                        }}>
                                                            {pos}
                                                        </Text>
                                                        {players.map(p => (
                                                            <View
                                                                key={p.player_id}
                                                                style={[styles.playerRow, { borderBottomColor: theme.border }]}
                                                            >
                                                                <Text style={{ color: theme.text, fontSize: 14 }}>{p.name}</Text>
                                                                <Text style={{ color: theme.textDim, fontSize: 13 }}>{p.nfl_team || '—'}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )
                                            })}
                                        </View>
                                    )}
                                </View>
                            )}
                        />
                    )
            )}

            {/* ── History Tab ── */}
            {tab === 'history' && (
                historyLoading
                    ? <Text style={{ color: theme.textDim, marginTop: 24 }}>Loading history...</Text>
                    : (
                        <>
                            {history.length === 0 && (
                                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                    <Text style={{ color: theme.textDim }}>
                                        No history yet. Check back after the season ends.
                                    </Text>
                                </View>
                            )}

                            {history.map(season => (
                                <View
                                    key={season.season}
                                    style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                                >
                                    <Text style={[styles.cardTitle, { color: theme.accent }]}>
                                        {season.season} Season
                                    </Text>
                                    <View style={styles.historyGrid}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.label, { color: theme.textDim }]}>Champion</Text>
                                            <Text style={{ color: theme.text, fontWeight: 'bold' }}>
                                                {season.champion?.team_name || '—'}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.label, { color: theme.textDim }]}>High Scorer</Text>
                                            <Text style={{ color: theme.text, fontWeight: 'bold' }}>
                                                {season.high_scorer?.team_name || '—'}
                                            </Text>
                                            {season.high_scorer && (
                                                <Text style={{ color: theme.textDim, fontSize: 12 }}>
                                                    {season.high_scorer.points.toFixed(1)} pts
                                                </Text>
                                            )}
                                        </View>
                                    </View>

                                    {season.awards.map(a => (
                                        <View
                                            key={a.id}
                                            style={[styles.awardRow, { borderTopColor: theme.border }]}
                                        >
                                            <Text style={{ color: theme.text, fontSize: 13, flex: 1 }}>
                                                {a.award_name}{' '}
                                                <Text style={{ color: theme.accent }}>{a.team_name}</Text>
                                            </Text>
                                            {isCommissioner && (
                                                <TouchableOpacity onPress={() => handleDeleteAward(a.id)}>
                                                    <Text style={{ color: theme.danger, fontSize: 12 }}>Remove</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    ))}
                                </View>
                            ))}

                            {/* ── Add Award (Commissioner Only) ── */}
                            {isCommissioner && (
                                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                    <Text style={[styles.cardTitle, { color: theme.accent }]}>Add Award</Text>

                                    <Text style={[styles.label, { color: theme.textDim }]}>Award Name</Text>
                                    <TextInput
                                        value={newAwardName}
                                        onChangeText={setNewAwardName}
                                        placeholder="e.g. MVP"
                                        placeholderTextColor={theme.textDim}
                                        style={[styles.input, { backgroundColor: theme.bgDeep, borderColor: theme.border, color: theme.text }]}
                                    />

                                    <Text style={[styles.label, { color: theme.textDim, marginTop: 12 }]}>Recipient</Text>
                                    {members.map(m => (
                                        <TouchableOpacity
                                            key={m.user_id}
                                            onPress={() => setNewAwardUser(m.user_id)}
                                            style={[styles.memberBtn, {
                                                borderColor: newAwardUser === m.user_id ? theme.accent : theme.border,
                                                backgroundColor: newAwardUser === m.user_id ? theme.bgDeep : 'transparent',
                                            }]}
                                        >
                                            <Text style={{
                                                color: newAwardUser === m.user_id ? theme.accent : theme.text,
                                                fontSize: 13,
                                            }}>
                                                {m.team_name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}

                                    <TouchableOpacity
                                        onPress={handleAddAward}
                                        style={[styles.btn, { backgroundColor: theme.accent, marginTop: 16 }]}
                                    >
                                        <Text style={styles.btnText}>Add Award</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </>
                    )
            )}
        </ScrollView>
    )
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    content: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 20,
    },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        marginBottom: 20,
    },
    tabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 2,
    },
    card: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    label: {
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
    },
    btn: {
        borderRadius: 8,
        padding: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    btnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 14,
    },
    rosterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
    },
    historyGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 12,
    },
    awardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderTopWidth: 1,
    },
    memberBtn: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 6,
    },
})
