import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '../lib/supabase'
import { darkTheme } from '../lib/theme'

const t = darkTheme

export default function LoginScreen() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleLogin = async () => {
        setLoading(true)
        setError('')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        setLoading(false)
    }

    return (
        <KeyboardAvoidingView style={[styles.container, { backgroundColor: t.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
            <TextInput
                style={[styles.input, { backgroundColor: t.bgCard, color: t.text, borderColor: t.border }]}
                placeholder="Password"
                placeholderTextColor={t.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
            />

            <TouchableOpacity style={[styles.btn, { backgroundColor: t.accent }]} onPress={handleLogin} disabled={loading}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.btnText}>Sign In</Text>}
            </TouchableOpacity>
        </KeyboardAvoidingView>
    )
}

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
})
