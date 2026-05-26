// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Switch,
    ActivityIndicator,
    Linking,
    Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'
import { supabase } from '../lib/supabase'

const API = process.env.EXPO_PUBLIC_API_URL


// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function ProfileScreen() {

    // ── Context ───────────────────────────────────────────────────────────────
    const navigation = useNavigation()
    const { user, signOut, session } = useAuth()
    const { theme, isDark, toggleTheme } = useTheme()
    const { leagues, activeLeague, setActiveLeague, refreshLeagues } = useLeague()

    // ── State ─────────────────────────────────────────────────────────────────
    const [username, setUsername] = useState('')
    const [teamName, setTeamName] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [payoutStatus, setPayoutStatus] = useState<{
        has_account: boolean
        account_id?: string
        onboarding_complete?: boolean
        ready_to_receive_payments?: boolean
    } | null>(null)
    const [payoutName, setPayoutName] = useState('')
    const [payoutEmail, setPayoutEmail] = useState('')
    const [payoutBusy, setPayoutBusy] = useState(false)
    const [joinCode, setJoinCode] = useState('')
    const [joinTeamName, setJoinTeamName] = useState('')
    const [joinLoading, setJoinLoading] = useState(false)
    const [joinError, setJoinError] = useState('')


    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return
        supabase
            .from('profiles')
            .select('username, team_name')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data) {
                    setUsername(data.username || '')
                    setTeamName(data.team_name || '')
                }
                setLoading(false)
            })
    }, [user?.id])

    useEffect(() => {
        if (!session) return
        fetch(`${API}/connect/accounts/status`, {
            headers: { Authorization: `Bearer ${session.access_token}` },
        })
            .then(r => r.json())
            .then(setPayoutStatus)
            .catch(() => setPayoutStatus({ has_account: false }))
    }, [session?.access_token])
    

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!user) return
        setSaving(true)
        const { error } = await supabase
            .from('profiles')
            .update({ username, team_name: teamName })
            .eq('id', user.id)
        if (error) console.log('save error:', error.message)
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const handleCreatePayout = () => {
        if (!payoutName.trim() || !payoutEmail.trim()) return
        Alert.alert(
            'Set Up Real Money Payouts',
            'This connects your account to Stripe for real-money payouts. Stripe requires identity verification. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue', onPress: async () => {
                        setPayoutBusy(true)
                        try {
                            const res = await fetch(`${API}/connect/accounts`, {
                                method: 'POST',
                                headers: {
                                    Authorization: `Bearer ${session?.access_token}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ display_name: payoutName, contact_email: payoutEmail }),
                            })
                            if (!res.ok) { Alert.alert('Error', 'Could not create account'); return }
                            const status = await fetch(`${API}/connect/accounts/status`, {
                                headers: { Authorization: `Bearer ${session?.access_token}` },
                            })
                            setPayoutStatus(await status.json())
                        } catch { Alert.alert('Error', 'Network error') }
                        finally { setPayoutBusy(false) }
                    },
                },
            ]
        )
    }
    
    const handleOnboard = () => {
        Alert.alert(
            'Open Stripe Verification',
            "You'll be taken to Stripe in your browser to complete identity verification for payouts.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Open', onPress: async () => {
                        setPayoutBusy(true)
                        try {
                            const res = await fetch(`${API}/connect/accounts/onboard`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${session?.access_token}` },
                            })
                            const data = await res.json()
                            if (data.url) await Linking.openURL(data.url)
                            else Alert.alert('Error', data.detail || 'No onboarding URL')
                        } catch { Alert.alert('Error', 'Network error') }
                        finally { setPayoutBusy(false) }
                    },
                },
            ]
        )
    }

    const handleJoinLeague = async () => {
        if (!joinCode.trim() || !joinTeamName.trim()) {
            setJoinError('Please enter both an invite code and a team name.')
            return
        }
        setJoinError('')
        setJoinLoading(true)
        try {
            const res = await fetch(`${API}/leagues/join`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    invite_code: joinCode.trim().toUpperCase(),
                    team_name: joinTeamName.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) { setJoinError(data.detail || 'Invalid invite code'); return }
            await refreshLeagues()
            setJoinCode('')
            setJoinTeamName('')
            Alert.alert('Success', `You joined ${data.name}!`)
        } catch {
            setJoinError('Network error')
        } finally {
            setJoinLoading(false)
        }
    }

    

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.bg }}
            contentContainerStyle={styles.content}
        >
            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.textHeading }]}>Profile</Text>
                <View style={{ width: 60 }} />
            </View>

            {loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : (
                <>
                    <Text style={[styles.email, { color: theme.textDim }]}>{user?.email}</Text>

                    {/* ── Username ── */}
                    <Text style={[styles.label, { color: theme.textMuted }]}>USERNAME</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Username"
                        placeholderTextColor={theme.textDim}
                        autoCapitalize="none"
                    />

                    {/* ── Team Name ── */}
                    <Text style={[styles.label, { color: theme.textMuted }]}>TEAM NAME</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                        value={teamName}
                        onChangeText={setTeamName}
                        placeholder="Team name"
                        placeholderTextColor={theme.textDim}
                    />

                    {/* ── Save Button ── */}
                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: saved ? theme.accentDark : theme.accentSec }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color={theme.btnText} />
                        ) : (
                            <Text style={{ color: saved ? theme.accent : theme.btnText, fontWeight: 'bold' }}>
                                {saved ? 'Saved ✓' : 'Save Changes'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* ── Appearance ── */}
                    <View style={[styles.section, { borderTopColor: theme.borderSubtle }]}>
                        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>APPEARANCE</Text>
                        <View style={styles.row}>
                            <Text style={{ color: theme.text, fontSize: 14 }}>Dark Mode</Text>
                            <Switch
                                value={isDark}
                                onValueChange={toggleTheme}
                                trackColor={{ false: theme.border, true: theme.accentDark }}
                                thumbColor={isDark ? theme.accent : theme.textMuted}
                            />
                        </View>
                    </View>

                    {/* ── Join League ── */}
                    <View style={[styles.section, { borderTopColor: theme.borderSubtle }]}>
                        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>JOIN A LEAGUE</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.bgCard, color: theme.accent, borderColor: theme.border, marginHorizontal: 0, letterSpacing: 2 }]}
                            value={joinCode}
                            onChangeText={v => setJoinCode(v.toUpperCase())}
                            placeholder="Invite code"
                            placeholderTextColor={theme.textDim}
                            autoCapitalize="characters"
                            autoCorrect={false}
                        />
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border, marginHorizontal: 0, marginTop: 10 }]}
                            value={joinTeamName}
                            onChangeText={setJoinTeamName}
                            placeholder="Your team name"
                            placeholderTextColor={theme.textDim}
                        />
                        {joinError ? (
                            <Text style={{ color: theme.danger, fontSize: 13, marginTop: 8 }}>{joinError}</Text>
                        ) : null}
                        <TouchableOpacity
                            style={[styles.saveBtn, { backgroundColor: theme.accentSec, margin: 0, marginTop: 14, opacity: joinLoading ? 0.6 : 1 }]}
                            onPress={handleJoinLeague}
                            disabled={joinLoading}
                        >
                            <Text style={{ color: theme.btnText, fontWeight: 'bold', fontSize: 14 }}>
                                {joinLoading ? 'Joining...' : 'Join League'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* ── League Switcher ── */}
                    <View style={[styles.section, { borderTopColor: theme.borderSubtle }]}>
                        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>LEAGUE</Text>
                        {leagues.map(l => (
                            <TouchableOpacity
                                key={l.id}
                                style={styles.row}
                                onPress={() => setActiveLeague(l)}
                            >
                                <Text style={{ color: theme.text, fontSize: 14 }}>{l.name}</Text>
                                {activeLeague?.id === l.id && (
                                    <Text style={{ color: theme.accent, fontSize: 13 }}>✓ Active</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* ── Payouts ── */}
                    <View style={[styles.section, { borderTopColor: theme.borderSubtle }]}>
                        <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>PAYOUTS</Text>
                        {payoutStatus === null ? (
                            <ActivityIndicator color={theme.accent} style={{ marginVertical: 8 }} />
                        ) : !payoutStatus.has_account ? (
                            <>
                                <Text style={{ color: theme.textDim, fontSize: 13, marginBottom: 16, lineHeight: 18 }}>
                                    Connect a Stripe account to receive bet winnings automatically.
                                </Text>
                                <TextInput
                                    style={[styles.payoutInput, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                                    value={payoutName}
                                    onChangeText={setPayoutName}
                                    placeholder="Display name"
                                    placeholderTextColor={theme.textDim}
                                />
                                <TextInput
                                    style={[styles.payoutInput, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border, marginTop: 10 }]}
                                    value={payoutEmail}
                                    onChangeText={setPayoutEmail}
                                    placeholder="Email for Stripe"
                                    placeholderTextColor={theme.textDim}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity
                                    style={[styles.payoutBtn, { backgroundColor: theme.accentSec, marginTop: 14, opacity: payoutBusy ? 0.6 : 1 }]}
                                    onPress={handleCreatePayout}
                                    disabled={payoutBusy}
                                >
                                    <Text style={{ color: theme.btnText, fontWeight: 'bold', fontSize: 14 }}>
                                        {payoutBusy ? 'Creating...' : 'Create Payout Account'}
                                    </Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.row}>
                                    <Text style={{ color: theme.text, fontSize: 14 }}>Onboarding</Text>
                                    <Text style={{ color: payoutStatus.onboarding_complete ? theme.accent : theme.warning, fontSize: 13, fontWeight: 'bold' }}>
                                        {payoutStatus.onboarding_complete ? '✓ Complete' : '⚠ Incomplete'}
                                    </Text>
                                </View>
                                <View style={styles.row}>
                                    <Text style={{ color: theme.text, fontSize: 14 }}>Payouts</Text>
                                    <Text style={{ color: payoutStatus.ready_to_receive_payments ? theme.accent : theme.textDim, fontSize: 13, fontWeight: 'bold' }}>
                                        {payoutStatus.ready_to_receive_payments ? '✓ Active' : '⏳ Pending'}
                                    </Text>
                                </View>
                                {!payoutStatus.onboarding_complete && (
                                    <TouchableOpacity
                                        style={[styles.payoutBtn, { backgroundColor: theme.accentSec, marginTop: 8, opacity: payoutBusy ? 0.6 : 1 }]}
                                        onPress={handleOnboard}
                                        disabled={payoutBusy}
                                    >
                                        <Text style={{ color: theme.btnText, fontWeight: 'bold', fontSize: 14 }}>
                                            {payoutBusy ? 'Opening...' : 'Complete Verification'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        )}
                    </View>


                    {/* ── Sign Out ── */}
                    <TouchableOpacity
                        style={[styles.signOutBtn, { borderColor: theme.danger }]}
                        onPress={signOut}
                    >
                        <Text style={{ color: theme.danger, fontSize: 14 }}>Sign Out</Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    )
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    content: {
        paddingBottom: 60,
    },
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
    email: {
        textAlign: 'center',
        fontSize: 13,
        paddingVertical: 20,
    },
    label: {
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: 6,
        marginTop: 16,
        paddingHorizontal: 24,
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
        fontSize: 15,
        marginHorizontal: 24,
    },
    payoutInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
    },
    payoutBtn: {
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },    
    saveBtn: {
        margin: 24,
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    section: {
        borderTopWidth: 1,
        marginTop: 8,
        paddingTop: 16,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 11,
        letterSpacing: 1,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    signOutBtn: {
        margin: 24,
        marginTop: 32,
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center',
    },
})
