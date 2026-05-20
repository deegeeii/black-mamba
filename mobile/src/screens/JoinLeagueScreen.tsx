// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API = process.env.EXPO_PUBLIC_API_URL

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function JoinLeagueScreen() {

    // ── Context ───────────────────────────────────────────────────────────────
    const navigation = useNavigation<any>()
    const { session } = useAuth()
    const { theme } = useTheme()
    const { refreshLeagues } = useLeague()

    // ── State ─────────────────────────────────────────────────────────────────
    const [inviteCode, setInviteCode] = useState('')
    const [teamName, setTeamName] = useState('')
    const [loading, setLoading] = useState(false)

    const headers = {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
    }

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleJoin = async () => {
        if (!inviteCode.trim() || !teamName.trim()) {
            Alert.alert('Required', 'Please enter both an invite code and a team name.')
            return
        }
        setLoading(true)
        try {
            const res = await fetch(`${API}/leagues/join`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    invite_code: inviteCode.trim().toUpperCase(),
                    team_name: teamName.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                Alert.alert('Error', data.detail || 'Invalid invite code')
                return
            }
            await refreshLeagues()
            navigation.navigate('Dashboard')
        } catch {
            Alert.alert('Error', 'Network error')
        } finally {
            setLoading(false)
        }
    }

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: theme.bg }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>

                {/* ── Header ── */}
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15, marginBottom: 32 }}>← Back</Text>
                </TouchableOpacity>

                <Text style={[styles.heading, { color: theme.text }]}>Join a League</Text>
                <Text style={[styles.sub, { color: theme.textDim }]}>
                    Enter the invite code your commissioner shared with you.
                </Text>

                {/* ── Invite Code ── */}
                <Text style={[styles.label, { color: theme.textMuted }]}>INVITE CODE</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.bgCard, color: theme.accent, borderColor: theme.border }]}
                    value={inviteCode}
                    onChangeText={v => setInviteCode(v.toUpperCase())}
                    placeholder="e.g. WP26RL7Z"
                    placeholderTextColor={theme.textDim}
                    autoCapitalize="characters"
                    autoCorrect={false}
                />

                {/* ── Team Name ── */}
                <Text style={[styles.label, { color: theme.textMuted }]}>YOUR TEAM NAME</Text>
                <TextInput
                    style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                    value={teamName}
                    onChangeText={setTeamName}
                    placeholder="e.g. Blitz Krieg"
                    placeholderTextColor={theme.textDim}
                />

                {/* ── Join Button ── */}
                <TouchableOpacity
                    style={[styles.btn, { backgroundColor: theme.accent, opacity: loading ? 0.6 : 1 }]}
                    onPress={handleJoin}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator color="#000" />
                        : <Text style={styles.btnText}>Join League</Text>
                    }
                </TouchableOpacity>

            </View>
        </KeyboardAvoidingView>
    )
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    content: {
        flex: 1,
        padding: 24,
        paddingTop: 60,
    },
    heading: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    sub: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 36,
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
        fontSize: 16,
        letterSpacing: 2,
    },
    btn: {
        width: '100%',
        padding: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 32,
    },
    btnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 15,
    },
})
