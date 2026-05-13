import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useNavigation } from '@react-navigation/native'
import { Picker } from '@react-native-picker/picker'
import { useLeague } from '../contexts/LeagueContext'



export default function DashboardScreen() {
    const { user, signOut } = useAuth()
    const { theme, isDark, toggleTheme } = useTheme()
    const navigation = useNavigation<any>()
    const { leagues, activeLeague, setActiveLeague } = useLeague()


    return (
        <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.content}>
                        <View style={styles.header}>
                <Text style={[styles.wordmark, { color: theme.accent }]}>BLACK MAMBA</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                    <Text style={{ color: theme.textDim, fontSize: 13 }}>Profile ›</Text>
                </TouchableOpacity>
            </View>


            <Text style={[styles.welcome, { color: theme.textMuted }]}>Welcome back</Text>
            <Text style={[styles.email, { color: theme.text }]}>{user?.email}</Text>

            <View style={styles.cardRow}>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('MyTeam')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>My Team</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>View roster & lineup</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('Matchups')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Matchups</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>This week's games</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('Standings')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Standings</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>League rankings</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('Bets')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Bets</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>H2H side bets</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.cardRow}>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('Chat')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Chat</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>League chat & AI bot</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]} onPress={() => navigation.navigate('Profile')}>
                    <Text style={[styles.cardLabel, { color: theme.text }]}>Profile</Text>
                    <Text style={[styles.cardSub, { color: theme.textDim }]}>Settings & appearance</Text>
                </TouchableOpacity>
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
    leagueRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    leagueBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
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
