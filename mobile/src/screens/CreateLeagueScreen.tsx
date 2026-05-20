// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    ActivityIndicator,
    Alert,
    Share,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API = process.env.EXPO_PUBLIC_API_URL

const SCORING_OPTIONS = [
    {
        key: 'standard',
        label: 'Standard',
        tag: '0.5 PPR',
        desc: 'Half-point per reception. The most popular format. Balanced between pass-heavy and run-heavy teams.',
    },
    {
        key: 'standard_plus',
        label: 'Standard+',
        tag: '1 PPR · Superflex',
        desc: 'Full point per reception plus a Superflex slot — start a second QB or any skill position. Higher scoring, more strategy.',
    },
    {
        key: 'dynasty',
        label: 'Dynasty',
        tag: '1 PPR · Keepers',
        desc: 'Full point per reception with keeper leagues. Build your roster across seasons. The deepest format.',
    },
]

const MAX_TEAMS_OPTIONS = [6, 8, 10, 12, 14, 16]

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function CreateLeagueScreen() {

    // ── Context ───────────────────────────────────────────────────────────────
    const navigation = useNavigation<any>()
    const { session } = useAuth()
    const { theme } = useTheme()
    const { refreshLeagues } = useLeague()

    // ── State ─────────────────────────────────────────────────────────────────
    const [step, setStep] = useState<1 | 2 | 3>(1)
    const [leagueName, setLeagueName] = useState('')
    const [teamName, setTeamName] = useState('')
    const [scoringType, setScoringType] = useState('standard')
    const [maxTeams, setMaxTeams] = useState(10)
    const [loading, setLoading] = useState(false)
    const [inviteCode, setInviteCode] = useState('')

    const headers = {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
    }

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleCreate = async () => {
        if (!leagueName.trim() || !teamName.trim()) {
            Alert.alert('Required', 'Please fill in all fields.')
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`${API}/leagues/`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    name: leagueName.trim(),
                    team_name: teamName.trim(),
                    scoring_type: scoringType,
                    max_teams: maxTeams,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                Alert.alert('Error', data.detail || 'Could not create league')
                return
            }
            setInviteCode(data.invite_code)
            await refreshLeagues()
            setStep(3)
        } catch {
            Alert.alert('Error', 'Network error')
        } finally {
            setLoading(false)
        }
    }

    const handleShare = () => {
        Share.share({
            message: `Join my Black Mamba fantasy league! Use invite code: ${inviteCode}`,
        })
    }

    // ── Step 1: League Setup ──────────────────────────────────────────────────
    if (step === 1) {
        return (
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.bg }}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Header ── */}
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15, marginBottom: 32 }}>← Back</Text>
                </TouchableOpacity>

                <Text style={[styles.stepLabel, { color: theme.textMuted }]}>STEP 1 OF 2</Text>
                <Text style={[styles.heading, { color: theme.text }]}>Set Up Your League</Text>

                {/* ── League Name ── */}
                <Text style={[styles.label, { color: theme.textMuted }]}>LEAGUE NAME</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                    value={leagueName}
                    onChangeText={setLeagueName}
                    placeholder="e.g. Monday Night Ballers"
                    placeholderTextColor={theme.textDim}
                />

                {/* ── Team Name ── */}
                <Text style={[styles.label, { color: theme.textMuted }]}>YOUR TEAM NAME</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder="e.g. Rushing Roulette"
                    placeholderTextColor={theme.textDim}
                />

                {/* ── Max Teams ── */}
                <Text style={[styles.label, { color: theme.textMuted }]}>LEAGUE SIZE</Text>
                <View style={styles.pillRow}>
                    {MAX_TEAMS_OPTIONS.map(n => (
                        <TouchableOpacity
                            key={n}
                            style={[
                                styles.pill,
                                {
                                    backgroundColor: maxTeams === n ? theme.accent : theme.bgCard,
                                    borderColor: maxTeams === n ? theme.accent : theme.border,
                                },
                            ]}
                            onPress={() => setMaxTeams(n)}
                        >
                            <Text style={{
                                color: maxTeams === n ? '#000' : theme.textMuted,
                                fontWeight: 'bold',
                                fontSize: 13,
                            }}>
                                {n}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={[styles.hint, { color: theme.textDim }]}>teams</Text>

                {/* ── Scoring Type ── */}
                <Text style={[styles.label, { color: theme.textMuted }]}>SCORING FORMAT</Text>
                {SCORING_OPTIONS.map(opt => (
                    <TouchableOpacity
                        key={opt.key}
                        style={[
                            styles.scoringCard,
                            {
                                backgroundColor: scoringType === opt.key ? theme.bgCard : theme.bg,
                                borderColor: scoringType === opt.key ? theme.accent : theme.border,
                            },
                        ]}
                        onPress={() => setScoringType(opt.key)}
                    >
                        <View style={styles.scoringTop}>
                            <Text style={[styles.scoringLabel, { color: scoringType === opt.key ? theme.accent : theme.text }]}>
                                {opt.label}
                            </Text>
                            <Text style={[styles.scoringTag, { color: theme.textMuted, backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                                {opt.tag}
                            </Text>
                        </View>
                        <Text style={[styles.scoringDesc, { color: theme.textDim }]}>{opt.desc}</Text>
                    </TouchableOpacity>
                ))}

                {/* ── Next ── */}
                <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.accent }]}
                    onPress={() => setStep(2)}
                >
                    <Text style={styles.btnText}>Next →</Text>
                </TouchableOpacity>

            </ScrollView>
        )
    }

    // ── Step 2: Confirm + Create ──────────────────────────────────────────────
    if (step === 2) {
        const selected = SCORING_OPTIONS.find(o => o.key === scoringType)!
        return (
            <ScrollView
                style={{ flex: 1, backgroundColor: theme.bg }}
                contentContainerStyle={styles.content}
            >
                {/* ── Header ── */}
                <TouchableOpacity onPress={() => setStep(1)}>
                    <Text style={{ color: theme.accent, fontSize: 15, marginBottom: 32 }}>← Back</Text>
                </TouchableOpacity>

                <Text style={[styles.stepLabel, { color: theme.textMuted }]}>STEP 2 OF 2</Text>
                <Text style={[styles.heading, { color: theme.text }]}>Confirm & Create</Text>

                {/* ── Summary ── */}
                <View style={[styles.summaryBox, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    {[
                        { label: 'League', value: leagueName },
                        { label: 'Your Team', value: teamName },
                        { label: 'Size', value: `${maxTeams} teams` },
                        { label: 'Format', value: `${selected.label} · ${selected.tag}` },
                    ].map(row => (
                        <View key={row.label} style={[styles.summaryRow, { borderTopColor: theme.borderSubtle }]}>
                            <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>{row.label}</Text>
                            <Text style={[styles.summaryValue, { color: theme.text }]}>{row.value}</Text>
                        </View>
                    ))}
                </View>

                {/* ── What happens next ── */}
                <View style={[styles.infoBox, { borderColor: theme.borderSubtle }]}>
                    <Text style={[styles.infoTitle, { color: theme.accent }]}>WHAT HAPPENS NEXT</Text>
                    {[
                        'You\'ll get an invite code to share with your league mates',
                        'Each member joins and sets their team name',
                        'Head to League settings to choose your AI bot persona',
                        'When everyone is in, start the snake draft',
                        'Set your lineup each week and place side bets',
                    ].map((item, i) => (
                        <View key={i} style={styles.infoRow}>
                            <Text style={[styles.infoNum, { color: theme.accent }]}>{i + 1}</Text>
                            <Text style={[styles.infoText, { color: theme.textDim }]}>{item}</Text>
                        </View>
                    ))}
                </View>

                {/* ── Create Button ── */}
                <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1 }]}
                    onPress={handleCreate}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#000" />
                        : <Text style={styles.btnText}>Create League</Text>
                    }
                </TouchableOpacity>

            </ScrollView>
        )
    }

    // ── Step 3: Invite Code ───────────────────────────────────────────────────
    return (
        <View style={[styles.successContainer, { backgroundColor: theme.bg }]}>
            <Text style={[styles.wordmark, { color: theme.accent }]}>League Created</Text>
            <Text style={[styles.successSub, { color: theme.textDim }]}>{leagueName}</Text>

            <View style={[styles.codeBox, { backgroundColor: theme.bgCard, borderColor: theme.accent }]}>
                <Text style={[styles.codeLabel, { color: theme.textMuted }]}>INVITE CODE</Text>
                <Text style={[styles.code, { color: theme.accent }]}>{inviteCode}</Text>
            </View>

            <Text style={[styles.codeHint, { color: theme.textDim }]}>
                Share this code with your league mates so they can join.
            </Text>

            <TouchableOpacity
                style={[styles.btn, { backgroundColor: theme.accent }]}
                onPress={handleShare}
            >
                <Text style={styles.btnText}>Share Invite Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.ghostBtn, { borderColor: theme.border }]}
                onPress={() => navigation.navigate('Dashboard')}
            >
                <Text style={[styles.ghostBtnText, { color: theme.text }]}>Go to My League</Text>
            </TouchableOpacity>
        </View>
    )
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    content: {
        padding: 24,
        paddingTop: 60,
        paddingBottom: 60,
    },
    stepLabel: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    heading: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 32,
    },
    label: {
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: 8,
        marginTop: 20,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
        fontSize: 15,
    },
    pillRow: {
        flexDirection: 'row',
        gap: 10,
        flexWrap: 'wrap',
    },
    pill: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    hint: {
        fontSize: 12,
        marginTop: 6,
        marginBottom: 4,
    },
    scoringCard: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
        marginBottom: 10,
    },
    scoringTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    scoringLabel: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    scoringTag: {
        fontSize: 11,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 3,
    },
    scoringDesc: {
        fontSize: 12,
        lineHeight: 18,
    },
    btn: {
        width: '100%',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 24,
    },
    btnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 15,
    },
    summaryBox: {
        borderRadius: 10,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 24,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderTopWidth: 1,
    },
    summaryLabel: {
        fontSize: 12,
        letterSpacing: 0.5,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    infoBox: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
    },
    infoTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 14,
    },
    infoRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 10,
        alignItems: 'flex-start',
    },
    infoNum: {
        fontSize: 13,
        fontWeight: 'bold',
        width: 16,
    },
    infoText: {
        fontSize: 13,
        lineHeight: 19,
        flex: 1,
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    wordmark: {
        fontSize: 26,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 6,
    },
    successSub: {
        fontSize: 14,
        marginBottom: 40,
    },
    codeBox: {
        width: '100%',
        borderWidth: 2,
        borderRadius: 12,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    codeLabel: {
        fontSize: 11,
        letterSpacing: 1.5,
        marginBottom: 8,
    },
    code: {
        fontSize: 36,
        fontWeight: 'bold',
        letterSpacing: 6,
    },
    codeHint: {
        fontSize: 13,
        textAlign: 'center',
        lineHeight: 19,
        marginBottom: 8,
    },
    ghostBtn: {
        width: '100%',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 12,
        borderWidth: 1,
    },
    ghostBtnText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
})
