// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function OnboardingScreen() {

    // ── Context ───────────────────────────────────────────────────────────────
    const navigation = useNavigation<any>()
    const { theme } = useTheme()

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: theme.bg }]}>

            {/* ── Wordmark ── */}
            <Text style={[styles.wordmark, { color: theme.accent }]}>BLACK MAMBA</Text>
            <Text style={[styles.subtitle, { color: theme.textDim }]}>Fantasy Sports</Text>

            {/* ── Welcome ── */}
            <Text style={[styles.heading, { color: theme.text }]}>Welcome</Text>
            <Text style={[styles.body, { color: theme.textDim }]}>
                Get started by creating your own league or joining one with an invite code.
            </Text>

            {/* ── Options ── */}
            <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.accentSec }]}
                onPress={() => navigation.navigate('CreateLeague')}
            >
                <Text style={[styles.primaryBtnText, { color: theme.btnText }]}>Create a League</Text>
                <Text style={[styles.primaryBtnSub, { color: theme.btnText, opacity: 0.7 }]}>You'll be the commissioner</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: theme.border, backgroundColor: theme.bgCard }]}
                onPress={() => navigation.navigate('JoinLeague')}
            >
                <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Join a League</Text>
                <Text style={[styles.secondaryBtnSub, { color: theme.textDim }]}>Enter an invite code</Text>
            </TouchableOpacity>

        </View>
    )
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    wordmark: {
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 4,
        marginBottom: 6,
    },
    subtitle: {
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: 56,
    },
    heading: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    body: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: 48,
    },
    primaryBtn: {
        width: '100%',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryBtnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    primaryBtnSub: {
        color: '#00000088',
        fontSize: 12,
    },
    secondaryBtn: {
        width: '100%',
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    secondaryBtnText: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 4,
    },
    secondaryBtnSub: {
        fontSize: 12,
    },
})
