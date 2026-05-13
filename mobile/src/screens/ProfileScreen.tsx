import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Switch, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'
import { supabase } from '../lib/supabase'

export default function ProfileScreen() {
    const navigation = useNavigation()
    const { user, signOut } = useAuth()
    const { theme, isDark, toggleTheme } = useTheme()
    const { leagues, activeLeague, setActiveLeague } = useLeague()

    const [username, setUsername] = useState('')
    const [teamName, setTeamName] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        if (!user) return
        supabase.from('profiles').select('username, team_name').eq('id', user.id).single()
            .then(({ data }) => {
                if (data) {
                    setUsername(data.username || '')
                    setTeamName(data.team_name || '')
                }
                setLoading(false)
            })
    }, [user?.id])

    const handleSave = async () => {
        if (!user) return
        setSaving(true)
        const { error } = await supabase.from('profiles').update({ username, team_name: teamName }).eq('id', user.id)
        if (error) console.log('save error:', error.message)
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
        const { data: { session: sbSession } } = await supabase.auth.getSession()
        console.log('supabase session uid:', sbSession?.user?.id)
        console.log('auth user id:', user?.id)

    }
    

    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Profile</Text>
                <View style={{ width: 60 }} />
            </View>

            {loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : (
                <>
                    <Text style={[styles.email, { color: theme.textDim }]}>{user?.email}</Text>

                    <Text style={[styles.label, { color: theme.textMuted }]}>USERNAME</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                        value={username}
                        onChangeText={setUsername}
                        placeholder="Username"
                        placeholderTextColor={theme.textDim}
                        autoCapitalize="none"
                    />

                    <Text style={[styles.label, { color: theme.textMuted }]}>TEAM NAME</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                        value={teamName}
                        onChangeText={setTeamName}
                        placeholder="Team name"
                        placeholderTextColor={theme.textDim}
                    />

                    <TouchableOpacity
                        style={[styles.saveBtn, { backgroundColor: saved ? theme.accentDark : theme.accent }]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={{ color: saved ? theme.accent : '#000', fontWeight: 'bold' }}>
                                {saved ? 'Saved ✓' : 'Save Changes'}
                            </Text>
                        )}
                    </TouchableOpacity>

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

                    <TouchableOpacity style={[styles.signOutBtn, { borderColor: theme.danger }]} onPress={signOut}>
                        <Text style={{ color: theme.danger, fontSize: 14 }}>Sign Out</Text>
                    </TouchableOpacity>
                </>
            )}
        </ScrollView>
    )
}

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
