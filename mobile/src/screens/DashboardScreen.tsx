import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function DashboardScreen() {
    const { user, signOut } = useAuth()
    const { theme, isDark, toggleTheme } = useTheme()

    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <Text style={[styles.wordmark, { color: theme.accent }]}>BLACK MAMBA</Text>
                <View style={styles.headerRight}>
                    <Switch
                        value={isDark}
                        onValueChange={toggleTheme}
                        trackColor={{ false: theme.border, true: theme.accentDark }}
                        thumbColor={isDark ? theme.accent : theme.textMuted}
                    />
                    <TouchableOpacity onPress={signOut} style={{ marginLeft: 16 }}>
                        <Text style={{ color: theme.textDim, fontSize: 13 }}>Sign Out</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={[styles.welcome, { color: theme.textMuted }]}>Welcome back</Text>
            <Text style={[styles.email, { color: theme.text }]}>{user?.email}</Text>

            <View style={styles.cardRow}>
                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>My Team</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>View roster & lineup</Text>
                </View>
                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Matchups</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>This week's games</Text>
                </View>
            </View>

            <View style={styles.cardRow}>
                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Bets</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>H2H side bets</Text>
                </View>
                <View style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Standings</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>League rankings</Text>
                </View>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    content: {
        padding: 24,
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    wordmark: {
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 3,
    },
    welcome: {
        fontSize: 14,
        marginBottom: 4,
    },
    email: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 32,
    },
    cardRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    card: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 10,
        padding: 18,
    },
    cardLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    cardSub: {
        fontSize: 12,
    },
})
