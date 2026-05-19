// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useState } from 'react'
import {
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { darkTheme } from '../lib/theme'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const t = darkTheme

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function LoginScreen() {

    // ── State ─────────────────────────────────────────────────────────────────
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [resetMode, setResetMode] = useState(false)
    const [resetSent, setResetSent] = useState(false)

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleLogin = async () => {
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        setLoading(false)
    }

    const handleReset = async () => {
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://black-mamba-qtpbzxpu9-deegeetwo.vercel.app/reset-password',
        })
        if (error) setError(error.message)
        else setResetSent(true)
        setLoading(false)
    }

    // ── Reset Sent State ──────────────────────────────────────────────────────
    if (resetSent) {
        return (
            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: t.bg }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Text style={[styles.wordmark, { color: t.accent }]}>BLACK MAMBA</Text>
                <Text style={[styles.subtitle, { color: t.textDim }]}>Fantasy Sports</Text>
                <Text style={[styles.info, { color: t.text }]}>
                    Check your email for a reset link. It will open in your browser to complete the reset.
                </Text>
                <TouchableOpacity onPress={() => { setResetMode(false); setResetSent(false) }}>
                    <Text style={[styles.link, { color: t.accent }]}>Back to Sign In</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        )
    }

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={[styles.container, { backgroundColor: t.bg }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <Text style={[styles.wordmark, { color: t.accent }]}>BLACK MAMBA</Text>
            <Text style={[styles.subtitle, { color: t.textDim }]}>Fantasy Sports</Text>

            {error ? <Text style={[styles.error, { color: t.danger }]}>{error}</Text> : null}

            <TextInput
                style={[styles.input, { backgroundColor: t.bgCard, color: t.text, borderColor: t.border }]}
                placeholder="Email"
                placeholderTextColor={t.textDim}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            {!resetMode && (
                <TextInput
                    style={[styles.input, { backgroundColor: t.bgCard, color: t.text, borderColor: t.border }]}
                    placeholder="Password"
                    placeholderTextColor={t.textDim}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />
            )}

            <TouchableOpacity
                style={[styles.btn, { backgroundColor: t.accent }]}
                onPress={resetMode ? handleReset : handleLogin}
                disabled={loading}
            >
                {loading
                    ? <ActivityIndicator color="#000" />
                    : <Text style={styles.btnText}>{resetMode ? 'Send Reset Link' : 'Sign In'}</Text>
                }
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.linkWrap}
                onPress={() => { setResetMode(!resetMode); setError('') }}
            >
                <Text style={[styles.link, { color: t.accent }]}>
                    {resetMode ? 'Back to Sign In' : 'Forgot Password?'}
                </Text>
            </TouchableOpacity>
        </KeyboardAvoidingView>
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
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 4,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        letterSpacing: 2,
        marginBottom: 48,
    },
    input: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 8,
        padding: 14,
        fontSize: 15,
        marginBottom: 12,
    },
    btn: {
        width: '100%',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    btnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 15,
    },
    error: {
        fontSize: 13,
        marginBottom: 16,
        textAlign: 'center',
    },
    linkWrap: {
        marginTop: 20,
    },
    link: {
        fontSize: 14,
    },
    info: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
})
