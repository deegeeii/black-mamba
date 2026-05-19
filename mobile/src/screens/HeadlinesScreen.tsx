// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import {
    View,
    Text,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
    StyleSheet,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../contexts/ThemeContext'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API = process.env.EXPO_PUBLIC_API_URL

// ── TYPES ──────────────────────────────────────────────────────────────────────
type Headline = {
    headline: string
    description: string
    link: string
}

// ── COMPONENT ──────────────────────────────────────────────────────────────────
export default function HeadlinesScreen() {

    // ── Context ───────────────────────────────────────────────────────────────
    const navigation = useNavigation()
    const { theme } = useTheme()

    // ── State ─────────────────────────────────────────────────────────────────
    const [headlines, setHeadlines] = useState<Headline[]>([])
    const [loading, setLoading] = useState(true)

    // ── Effects ───────────────────────────────────────────────────────────────
    useEffect(() => {
        fetch(`${API}/headlines`)
            .then(r => r.json())
            .then(data => {
                setHeadlines(Array.isArray(data) ? data : [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [])

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <View style={{ flex: 1, backgroundColor: theme.bg }}>

            {/* ── Header ── */}
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Headlines</Text>
                <View style={{ width: 60 }} />
            </View>

            {loading ? (
                <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
            ) : headlines.length === 0 ? (
                <Text style={[styles.empty, { color: theme.textDim }]}>No headlines available</Text>
            ) : (
                <FlatList
                    data={headlines}
                    keyExtractor={(_, i) => String(i)}
                    contentContainerStyle={styles.list}
                    renderItem={({ item: h }) => (
                        <TouchableOpacity
                            style={[styles.card, { backgroundColor: theme.bgCard, borderColor: theme.border }]}
                            onPress={() => Linking.openURL(h.link)}
                        >
                            <Text style={[styles.headline, { color: theme.text }]}>
                                {h.headline}
                            </Text>
                            {!!h.description && (
                                <Text
                                    style={[styles.description, { color: theme.textDim }]}
                                    numberOfLines={2}
                                >
                                    {h.description}
                                </Text>
                            )}
                            <Text style={[styles.readMore, { color: theme.accent }]}>Read more ›</Text>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    )
}

// ── STYLES ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
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
    list: {
        padding: 16,
        gap: 12,
    },
    card: {
        borderWidth: 1,
        borderRadius: 10,
        padding: 16,
    },
    headline: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    description: {
        fontSize: 12,
        lineHeight: 17,
        marginBottom: 8,
    },
    readMore: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    empty: {
        textAlign: 'center',
        marginTop: 60,
        fontSize: 14,
    },
})
