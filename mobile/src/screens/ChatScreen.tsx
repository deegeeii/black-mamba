import { useEffect, useState, useRef, useCallback } from 'react'
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Image,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'
import { supabase } from '../lib/supabase'

const API = process.env.EXPO_PUBLIC_API_URL

type Message = {
    id: string
    user_id: string | null
    message: string | null
    is_bot: boolean
    bot_name: string | null
    bot_trigger: string | null
    created_at: string
}

type ActivityItem = {
    id: string
    user_id: string
    team_name: string
    player_name: string
    player_position: string
    move_type: 'add' | 'drop'
    week: number
    created_at: string
}

const isImage = (msg: string | null) =>
    !!msg && (
        /\.(gif|png|jpe?g|webp)$/i.test(msg) ||
        msg.includes('giphy.com') ||
        (msg.includes('supabase') && msg.includes('chat-images'))
    )

export default function ChatScreen() {
    const navigation = useNavigation()
    const { session, user } = useAuth()
    const { theme } = useTheme()
    const { activeLeague, getTeamName } = useLeague()

    const [tab, setTab] = useState<'chat' | 'activity'>('chat')
    const [messages, setMessages] = useState<Message[]>([])
    const [activity, setActivity] = useState<ActivityItem[]>([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [botLoading, setBotLoading] = useState(false)
    const [activityLoading, setActivityLoading] = useState(false)
    const listRef = useRef<FlatList>(null)

    const headers = {
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
    }

    const fetchMessages = useCallback(() => {
        if (!activeLeague || !session) return
        fetch(`${API}/leagues/${activeLeague.id}/chat`, { headers })
            .then(r => r.json())
            .then(data => {
                setMessages(Array.isArray(data) ? [...data].reverse() : [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [activeLeague?.id, session?.access_token])

    const fetchActivity = useCallback(async () => {
        if (!activeLeague || !session) return
        setActivityLoading(true)
        try {
            const res = await fetch(`${API}/leagues/${activeLeague.id}/activity`, { headers })
            const data = await res.json()
            setActivity(Array.isArray(data) ? data : [])
        } catch {
            setActivity([])
        } finally {
            setActivityLoading(false)
        }
    }, [activeLeague?.id, session?.access_token])

    useEffect(() => { fetchMessages() }, [fetchMessages])

    useEffect(() => {
        if (tab === 'activity') fetchActivity()
    }, [tab, fetchActivity])

    useEffect(() => {
        if (!activeLeague) return
        const channel = supabase
            .channel(`chat:${activeLeague.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'league_messages',
                filter: `league_id=eq.${activeLeague.id}`,
            }, (payload: any) => {
                setMessages(prev => [payload.new as Message, ...prev])
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [activeLeague?.id])

    const handleSend = async () => {
        if (!text.trim() || !activeLeague || sending) return
        setSending(true)
        try {
            await fetch(`${API}/leagues/${activeLeague.id}/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ message: text.trim() }),
            })
            setText('')
        } catch (e) {
            console.log('chat error:', e)
        } finally {
            setSending(false)
        }
    }

    const handleAskBot = async () => {
        if (!activeLeague || botLoading) return
        setBotLoading(true)
        try {
            await fetch(`${API}/leagues/${activeLeague.id}/chat/bot`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ trigger: 'manual', context: 'League members requested a bot update.' }),
            })
        } catch {
            // silent
        } finally {
            setBotLoading(false)
        }
    }

    const formatTime = (ts: string) =>
        new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: theme.bg }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <View style={[styles.header, { borderBottomColor: theme.borderSubtle }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: theme.accent, fontSize: 15 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.text }]}>Chat</Text>
                <View style={{ width: 60 }} />
            </View>

            {/* Tabs */}
            <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
                {(['chat', 'activity'] as const).map(t => (
                    <TouchableOpacity
                        key={t}
                        onPress={() => setTab(t)}
                        style={[
                            styles.tabBtn,
                            { borderBottomColor: tab === t ? theme.accent : 'transparent' },
                        ]}
                    >
                        <Text style={{
                            color: tab === t ? theme.accent : theme.textDim,
                            fontWeight: tab === t ? 'bold' : 'normal',
                            fontSize: 13,
                        }}>
                            {t === 'chat' ? 'Chat' : 'Activity'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {tab === 'chat' && (
                <>
                    {loading ? (
                        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
                    ) : (
                        <FlatList
                            ref={listRef}
                            data={messages}
                            keyExtractor={item => item.id}
                            contentContainerStyle={styles.list}
                            inverted
                            renderItem={({ item }) => {
                                const isMe = item.user_id === user?.id && !item.is_bot

                                if (item.is_bot) return (
                                    <View style={styles.botRow}>
                                        <View style={styles.botBubble}>
                                            <Text style={styles.botName}>
                                                🐍 {item.bot_name || 'Commissioner Bot'}
                                            </Text>
                                            <Text style={styles.botText}>{item.message ?? ''}</Text>
                                            <Text style={styles.botTime}>{formatTime(item.created_at)}</Text>
                                        </View>
                                    </View>
                                )

                                return (
                                    <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                                        {!isMe && (
                                            <Text style={[styles.senderName, { color: theme.textDim }]}>
                                                {getTeamName(item.user_id)}
                                            </Text>
                                        )}
                                        {isImage(item.message) ? (
                                            <Image
                                                source={{ uri: item.message! }}
                                                style={styles.imageMsg}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={[
                                                styles.bubble,
                                                isMe
                                                    ? { backgroundColor: theme.accent }
                                                    : { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1 },
                                            ]}>
                                                <Text style={{ color: isMe ? '#000' : theme.text, fontSize: 14 }}>
                                                    {item.message ?? ''}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={[styles.time, { color: theme.textDim }]}>
                                            {formatTime(item.created_at)}
                                        </Text>
                                    </View>
                                )
                            }}
                        />
                    )}

                    <View style={[styles.inputRow, { backgroundColor: theme.bgDeep, borderTopColor: theme.borderSubtle }]}>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.bgCard, color: theme.text, borderColor: theme.border }]}
                            value={text}
                            onChangeText={setText}
                            placeholder="Message..."
                            placeholderTextColor={theme.textDim}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.botBtn, { borderColor: theme.accent, opacity: botLoading ? 0.5 : 1 }]}
                            onPress={handleAskBot}
                            disabled={botLoading}
                        >
                            <Text style={{ color: theme.accent, fontSize: 11, fontWeight: 'bold' }}>
                                {botLoading ? '...' : 'BOT'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.sendBtn, { backgroundColor: text.trim() ? theme.accent : theme.bgCard }]}
                            onPress={handleSend}
                            disabled={sending || !text.trim()}
                        >
                            <Text style={{ color: text.trim() ? '#000' : theme.textDim, fontWeight: 'bold' }}>↑</Text>
                        </TouchableOpacity>
                    </View>
                </>
            )}

            {tab === 'activity' && (
                <View style={{ flex: 1 }}>
                    {activityLoading ? (
                        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
                    ) : activity.length === 0 ? (
                        <Text style={{ color: theme.textDim, textAlign: 'center', marginTop: 40 }}>
                            No roster moves yet.
                        </Text>
                    ) : (
                        <FlatList
                            data={activity}
                            keyExtractor={item => item.id}
                            contentContainerStyle={{ padding: 16 }}
                            renderItem={({ item }) => (
                                <View style={[styles.activityRow, { borderBottomColor: theme.borderSubtle }]}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                            <Text style={{
                                                color: item.move_type === 'add' ? theme.accent : '#ff4444',
                                                fontWeight: 'bold',
                                                fontSize: 11,
                                                letterSpacing: 1,
                                            }}>
                                                {item.move_type === 'add' ? '+ ADD' : '− DROP'}
                                            </Text>
                                            <Text style={{ color: theme.text, fontSize: 14 }}>
                                                {item.player_name}
                                            </Text>
                                            <Text style={{ color: theme.textDim, fontSize: 12 }}>
                                                {item.player_position}
                                            </Text>
                                        </View>
                                        <Text style={{ color: theme.textDim, fontSize: 12 }}>
                                            {item.team_name} · Wk {item.week} · {formatTime(item.created_at)}
                                        </Text>
                                    </View>
                                </View>
                            )}
                        />
                    )}
                </View>
            )}
        </KeyboardAvoidingView>
    )
}

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
    title: { fontSize: 17, fontWeight: 'bold' },
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tabBtn: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderBottomWidth: 2,
        marginBottom: -1,
    },
    list: { padding: 16, gap: 8 },
    msgRow: { alignItems: 'flex-start', maxWidth: '80%' },
    msgRowMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    senderName: { fontSize: 11, marginBottom: 3, paddingLeft: 4 },
    bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
    imageMsg: { width: 200, height: 150, borderRadius: 12 },
    time: { fontSize: 10, marginTop: 3, paddingHorizontal: 4 },
    botRow: { alignItems: 'center', marginVertical: 4 },
    botBubble: {
        backgroundColor: '#1f1800',
        borderRadius: 10,
        padding: 12,
        maxWidth: '90%',
        borderWidth: 1,
        borderColor: '#ffcc44',
    },
    botName: { color: '#ffcc44', fontSize: 11, fontWeight: 'bold', marginBottom: 4 },
    botText: { color: '#ffcc44', fontSize: 13 },
    botTime: { color: '#a08800', fontSize: 10, marginTop: 4 },
    inputRow: {
        flexDirection: 'row',
        padding: 12,
        gap: 8,
        borderTopWidth: 1,
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 14,
        maxHeight: 100,
    },
    botBtn: {
        width: 42,
        height: 38,
        borderRadius: 19,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    activityRow: {
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
})
