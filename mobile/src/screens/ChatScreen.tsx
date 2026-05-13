import { useEffect, useState, useRef } from 'react'
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useLeague } from '../contexts/LeagueContext'
import { supabase } from '../lib/supabase'

const API = process.env.EXPO_PUBLIC_API_URL

type Message = {
    id: string
    user_id: string
    message: string
    sender_name: string
    is_bot: boolean
    created_at: string
}

export default function ChatScreen() {
    const navigation = useNavigation()
    const { session, user } = useAuth()
    const { theme } = useTheme()
    const { activeLeague } = useLeague()

    const [messages, setMessages] = useState<Message[]>([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const listRef = useRef<FlatList>(null)

    const headers = { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' }

    useEffect(() => {
        if (!activeLeague || !session) return
        fetch(`${API}/leagues/${activeLeague.id}/chat`, { headers })
            .then(r => r.json())
            .then(data => {
                setMessages(Array.isArray(data) ? [...data].reverse() : [])
                setLoading(false)
            })                        
            .catch(() => setLoading(false))
    }, [activeLeague?.id, session])

    useEffect(() => {
        if (!activeLeague) return
        const channel = supabase
            .channel(`chat:${activeLeague.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'league_messages',
                filter: `league_id=eq.${activeLeague.id}`,
            }, (payload) => {
                setMessages(prev => [payload.new as Message, ...prev])
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [activeLeague?.id])

    const handleSend = async () => {
        if (!text.trim() || !activeLeague) return
        setSending(true)
        try {
            const res = await fetch(`${API}/leagues/${activeLeague.id}/chat`, {
                method: 'POST', headers,
                body: JSON.stringify({ message: text.trim() }),
            })
            const data = await res.json()
            setText('')
        } catch (e) {
            console.log('chat error:', e)
        }
        setSending(false)
    }


    const formatTime = (ts: string) => {
        const d = new Date(ts)
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }

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
                        const isMe = item.user_id === user?.id
                        const isBot = item.is_bot

                        if (isBot) return (
                            <View style={styles.botRow}>
                                <View style={[styles.botBubble]}>
                                    <Text style={styles.botName}>🐍 Commissioner Bot</Text>
                                    <Text style={styles.botText}>{item.message}</Text>
                                    <Text style={styles.botTime}>{formatTime(item.created_at)}</Text>
                                </View>
                            </View>
                        )

                        return (
                            <View style={[styles.msgRow, isMe && styles.msgRowMe]}>
                                {!isMe && (
                                    <Text style={[styles.senderName, { color: theme.textDim }]}>
                                        {item.sender_name || 'Unknown'}
                                    </Text>
                                )}
                                <View style={[
                                    styles.bubble,
                                    isMe
                                        ? { backgroundColor: theme.accent }
                                        : { backgroundColor: theme.bgCard, borderColor: theme.border, borderWidth: 1 }
                                ]}>
                                    <Text style={{ color: isMe ? '#000' : theme.text, fontSize: 14 }}>
                                        {item.message}
                                    </Text>
                                </View>
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
                    style={[styles.sendBtn, { backgroundColor: text.trim() ? theme.accent : theme.bgCard }]}
                    onPress={handleSend}
                    disabled={sending || !text.trim()}
                >
                    <Text style={{ color: text.trim() ? '#000' : theme.textDim, fontWeight: 'bold' }}>↑</Text>
                </TouchableOpacity>
            </View>
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
    list: { padding: 16, gap: 8 },
    msgRow: { alignItems: 'flex-start', maxWidth: '80%' },
    msgRowMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
    senderName: { fontSize: 11, marginBottom: 3, paddingLeft: 4 },
    bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
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
    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
})
