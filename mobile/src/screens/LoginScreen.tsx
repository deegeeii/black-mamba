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
    ScrollView,
    View,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { darkTheme } from '../lib/theme'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const t = darkTheme

const FEATURES = [
    {
        title: 'AI Commissioner',
        desc: 'Pick your league\'s AI persona — Coach, Hype Bot, or Sensei. It trash-talks, predicts, and runs your league.',
    },
    {
        title: 'Real Money Bets',
        desc: 'H2H side bets and pool bets with automatic Stripe payouts. No Venmo chasing.',
    },
    {
        title: 'AI Quick Tourneys',
        desc: 'Spin up a bracket for any live sport — World Cup, NBA playoffs, Olympics. AI builds the draft pool instantly.',
    },
    {
        title: 'Deeper Scoring',
        desc: 'Standard (0.5 PPR), Standard+ (1 PPR + Superflex), or Dynasty (keeper leagues). More strategy than ESPN or Yahoo.',
    },
]

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function LoginScreen() {

    // ── State ─────────────────────────────────────────────────────────────────
    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [resetMode, setResetMode] = useState(false)
    const [resetSent, setResetSent] = useState(false)
    const [signUpSent, setSignUpSent] = useState(false)

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleLogin = async () => {
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        setLoading(false)
    }

    const handleSignUp = async () => {
        if (password !== confirmPassword) {
            setError('Passwords do not match')
            return
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) setError(error.message)
        else setSignUpSent(true)
        setLoading(false)
    }

    const handleReset = async () => {
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://blackmambafantasysports.com/reset-password',
        })
        if (error) setError(error.message)
        else setResetSent(true)
        setLoading(false)
    }

    const switchMode = (next: 'signin' | 'signup') => {
        setMode(next)
        setError('')
        setPassword('')
        setConfirmPassword('')
        setResetMode(false)
    }

    // ── Reset Sent ────────────────────────────────────────────────────────────
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

    // ── Sign Up Sent ──────────────────────────────────────────────────────────
    if (signUpSent) {
        return (
            <KeyboardAvoidingView
                style={[styles.confirmContainer, { backgroundColor: t.bg }]}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <Text style={[styles.wordmark, { color: t.accent }]}>BLACK MAMBA</Text>
                <Text style={[styles.subtitle, { color: t.textDim }]}>Fantasy Sports</Text>
                <Text style={[styles.confirmTitle, { color: t.text }]}>Account Created</Text>
                <Text style={[styles.info, { color: t.textDim }]}>
                    Check your email to confirm your account, then sign in to create or join your league.
                </Text>
                <TouchableOpacity
                    style={[styles.btn, { backgroundColor: t.accentSec }]}
                    onPress={() => { setSignUpSent(false); switchMode('signin') }}
                >
                    <Text style={styles.btnText}>Sign In</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        )
    }

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: t.bg }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Wordmark ── */}
                <Text style={[styles.wordmark, { color: t.accent }]}>BLACK MAMBA</Text>
                <Text style={[styles.subtitle, { color: t.textDim }]}>Fantasy Sports</Text>

                {/* ── Mode Tabs ── */}
                <View style={[styles.tabRow, { borderBottomColor: t.border }]}>
                    {(['signin', 'signup'] as const).map(m => (
                        <TouchableOpacity
                            key={m}
                            style={[
                                styles.tab,
                                mode === m && { borderBottomColor: t.accent, borderBottomWidth: 2 },
                            ]}
                            onPress={() => switchMode(m)}
                        >
                            <Text style={{
                                color: mode === m ? t.accent : t.textDim,
                                fontWeight: 'bold',
                                fontSize: 14,
                            }}>
                                {m === 'signin' ? 'Sign In' : 'Create Account'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* ── Error ── */}
                {error ? (
                    <Text style={[styles.error, { color: t.danger }]}>{error}</Text>
                ) : null}

                {/* ── Inputs ── */}
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

                {mode === 'signup' && (
                    <TextInput
                        style={[styles.input, { backgroundColor: t.bgCard, color: t.text, borderColor: t.border }]}
                        placeholder="Confirm Password"
                        placeholderTextColor={t.textDim}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                    />
                )}

                {/* ── Primary Button ── */}
                <TouchableOpacity
                    style={[styles.btn, { backgroundColor: t.accentSec }]}
                    onPress={
                        resetMode ? handleReset
                        : mode === 'signup' ? handleSignUp
                        : handleLogin
                    }
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color={t.btnText} />
                    ) : (
                        <Text style={styles.btnText}>
                            {resetMode ? 'Send Reset Link'
                            : mode === 'signup' ? 'Create Account'
                            : 'Sign In'}
                        </Text>
                    )}
                </TouchableOpacity>

                {/* ── Forgot Password ── */}
                {mode === 'signin' && (
                    <TouchableOpacity
                        style={styles.linkWrap}
                        onPress={() => { setResetMode(!resetMode); setError('') }}
                    >
                        <Text style={[styles.link, { color: t.accent }]}>
                            {resetMode ? 'Back to Sign In' : 'Forgot Password?'}
                        </Text>
                    </TouchableOpacity>
                )}

                {/* ── Why Black Mamba (sign up tab only) ── */}
                {mode === 'signup' && (
                    <View style={[styles.featureBox, { borderColor: t.border, backgroundColor: t.bgCard }]}>
                        <Text style={[styles.featureTitle, { color: t.accent }]}>WHY BLACK MAMBA?</Text>
                        {FEATURES.map(f => (
                            <View key={f.title} style={[styles.featureRow, { borderTopColor: t.borderSubtle }]}>
                                <Text style={[styles.featureName, { color: t.text }]}>{f.title}</Text>
                                <Text style={[styles.featureDesc, { color: t.textDim }]}>{f.desc}</Text>
                            </View>
                        ))}
                    </View>
                )}

            </ScrollView>
        </KeyboardAvoidingView>
    )
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 32,
        paddingTop: 80,
        paddingBottom: 60,
    },
    confirmContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    wordmark: {
        fontFamily: 'Georgia',
        fontSize: 32,
        fontWeight: 'bold',
        letterSpacing: 4,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        letterSpacing: 2,
        marginBottom: 40,
    },
    tabRow: {
        flexDirection: 'row',
        width: '100%',
        borderBottomWidth: 1,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingBottom: 12,
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
        color: t.btnText,
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
    confirmTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    featureBox: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 12,
        padding: 20,
        marginTop: 32,
    },
    featureTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 16,
    },
    featureRow: {
        borderTopWidth: 1,
        paddingTop: 12,
        marginTop: 12,
    },
    featureName: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    featureDesc: {
        fontSize: 12,
        lineHeight: 18,
    },
})
