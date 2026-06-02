// ── IMPORTS ────────────────────────────────────────────────────────────────────
import type { CSSProperties } from 'react'
import { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLeague } from '../contexts/LeagueContext'
import axios from 'axios'

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL

// ── INTERFACES / TYPES ─────────────────────────────────────────────────────────
type Tab = 'settings' | 'rosters' | 'history' | 'commissioner'

interface Player { player_id: string; name: string; position: string; nfl_team: string | null }
interface MemberRoster { user_id: string; team_name: string; avatar_url: string | null; roster: Player[] }
interface Award { id: string; award_name: string; user_id: string; team_name: string }
interface Season {
    season: number
    champion: { user_id: string; team_name: string } | null
    high_scorer: { user_id: string; team_name: string; points: number } | null
    awards: Award[]
}

// ── STYLE CONSTANTS ────────────────────────────────────────────────────────────
const POSITION_ORDER = ['QB', 'RB', 'WR', 'TE']

const card: CSSProperties = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '20px',
    marginBottom: '16px',
}

const inputStyle: CSSProperties = {
    width: '100%',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    padding: '10px',
    color: 'var(--text)',
    fontSize: '14px',
    marginTop: '6px',
    boxSizing: 'border-box',
}

const labelStyle: CSSProperties = {
    color: 'var(--text-dim)',
    fontSize: '12px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
}

export default function LeagueHome() {
    // ── STATE ──────────────────────────────────────────────────────────────────
    const { leagueId } = useParams<{ leagueId: string }>()
    const { session, user } = useAuth()
    const { activeLeague, members } = useLeague()
    const [tab, setTab] = useState<Tab>('settings')

    // Team Settings state
    const [teamName, setTeamName] = useState('')
    const [avatarUrl, setAvatarUrl] = useState('')
    const [settingsLoading, setSettingsLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    // Rosters state
    const [rosters, setRosters] = useState<MemberRoster[]>([])
    const [rostersLoading, setRostersLoading] = useState(true)
    const [expanded, setExpanded] = useState<string | null>(null)

    // History state
    const [history, setHistory] = useState<Season[]>([])
    const [historyLoading, setHistoryLoading] = useState(true)
    const [newAwardName, setNewAwardName] = useState('')
    const [newAwardUser, setNewAwardUser] = useState('')
    const [newAwardSeason, setNewAwardSeason] = useState(2024)
    const [awardSaving, setAwardSaving] = useState(false)
    const [espnLeagueId, setEspnLeagueId] = useState('')
    const [espnSeason, setEspnSeason] = useState(2024)
    const [espnS2, setEspnS2] = useState('')
    const [espnSwid, setEspnSwid] = useState('')
    const [importing, setImporting] = useState(false)
    const [importMessage, setImportMessage] = useState('')

    // Commissioner state
    const isCommissioner = activeLeague?.commissioner_id === user?.id
    const [botPersona, setBotPersona] = useState<string>('commissioner')
    const [personaSaving, setPersonaSaving] = useState(false)
    const [personaSaved, setPersonaSaved] = useState(false)

    // ── EFFECTS / FETCH ON MOUNT ───────────────────────────────────────────────
    const headers = useMemo(() => ({
        Authorization: `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json',
    }), [session?.access_token])

    useEffect(() => {
        if (!session) return
        Promise.allSettled([
            axios.get(`${API_URL}/leagues/${leagueId}/members`, { headers }),
            axios.get(`${API_URL}/profile/`, { headers }),
            axios.get(`${API_URL}/leagues/`, { headers }),
        ]).then(([membersRes, profileRes, leaguesRes]) => {
            if (membersRes.status === 'fulfilled') {
                const me = membersRes.value.data.find((m: { user_id: string; team_name?: string }) => m.user_id === session.user.id)
                if (me?.team_name) setTeamName(me.team_name)
            }
            if (profileRes.status === 'fulfilled') setAvatarUrl(profileRes.value.data.avatar_url || '')
            if (leaguesRes.status === 'fulfilled') {
                const league = leaguesRes.value.data.find((l: { id: string; bot_persona?: string }) => l.id === leagueId)
                if (league?.bot_persona) setBotPersona(league.bot_persona)
            }
            setSettingsLoading(false)
        })

    }, [session, leagueId, headers])

    useEffect(() => {
        if (!session) return
        axios.get(`${API_URL}/leagues/${leagueId}/rosters`, { headers })
            .then(res => { setRosters(res.data); setRostersLoading(false) })
            .catch(() => setRostersLoading(false))
    }, [session, leagueId, headers])

    const fetchHistory = () => {
        if (!session) return
        axios.get(`${API_URL}/leagues/${leagueId}/history`, { headers })
            .then(res => { setHistory(res.data); setHistoryLoading(false) })
            .catch(() => setHistoryLoading(false))
    }
    useEffect(() => { fetchHistory() }, [session, leagueId, headers])

    // ── HANDLERS ───────────────────────────────────────────────────────────────
    const handleSaveSettings = async (e: { preventDefault(): void }) => {
        e.preventDefault()
        setSaving(true)
        setMessage('')
        try {
            await axios.patch(`${API_URL}/leagues/${leagueId}/my-team`, { team_name: teamName, avatar_url: avatarUrl }, { headers })
            setMessage('Saved!')
        } catch {
            setMessage('Something went wrong.')
        } finally {
            setSaving(false)
        }
    }

    const handleSavePersona = async (persona: string) => {
        if (!isCommissioner || personaSaving) return
        setBotPersona(persona)
        setPersonaSaving(true)
        setPersonaSaved(false)
        try {
            await axios.patch(
                `${API_URL}/leagues/${leagueId}/bot-persona`,
                { bot_persona: persona },
                { headers }
            )
            setPersonaSaved(true)
            setTimeout(() => setPersonaSaved(false), 2000)
        } catch {
            // silent
        } finally {
            setPersonaSaving(false)
        }
    }

    const handleAddAward = async (e: { preventDefault(): void }) => {
        e.preventDefault()
        if (!newAwardName || !newAwardUser) return
        setAwardSaving(true)
        try {
            await axios.post(`${API_URL}/leagues/${leagueId}/history/awards`, {
                season: newAwardSeason, award_name: newAwardName, user_id: newAwardUser,
            }, { headers })
            setNewAwardName('')
            setNewAwardUser('')
            fetchHistory()
        } finally {
            setAwardSaving(false)
        }
    }

    const handleDeleteAward = async (awardId: string) => {
        await axios.delete(`${API_URL}/leagues/${leagueId}/history/awards/${awardId}`, { headers })
        fetchHistory()
    }

    const handleESPNImport = async (e: { preventDefault(): void }) => {
        e.preventDefault()
        if (!espnLeagueId) return
        setImporting(true)
        setImportMessage('')
        try {
            const res = await axios.post(
                `${API_URL}/leagues/${leagueId}/history/import-espn`,
                {
                    espn_league_id: espnLeagueId,
                    season: espnSeason,
                    espn_s2: espnS2 || null,
                    swid: espnSwid || null,
                },
                { headers }
            )
            setImportMessage(
                `Imported ${res.data.season}: ${res.data.champion_name || '—'} won, ` +
                `${res.data.high_scorer_name || '—'} scored most points`
            )
            fetchHistory()
        } catch (e: any) {
            setImportMessage(e.response?.data?.detail || 'Import failed')
        } finally {
            setImporting(false)
        }
    }

    // ── HELPERS ────────────────────────────────────────────────────────────────
    const sortedRoster = (players: Player[]) =>
        [...players].sort((a, b) => POSITION_ORDER.indexOf(a.position) - POSITION_ORDER.indexOf(b.position))

    const tabStyle = (t: Tab): CSSProperties => ({
        padding: '10px 20px',
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: tab === t ? 'bold' : 'normal',
        color: tab === t ? 'var(--accent)' : 'var(--text-dim)',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
    })

    // ── JSX ────────────────────────────────────────────────────────────────────
    return (
        <div style={{ position: 'relative', overflow: 'hidden' }}>
            <img
                src="/snake.png"
                style={{
                    position: 'absolute',
                    right: '-120px',
                    bottom: '-80px',
                    width: '700px',
                    opacity: 0.07,
                    pointerEvents: 'none',
                }}
            />
            <div style={{ maxWidth: '700px', color: 'var(--text)', position: 'relative', zIndex: 1 }}>

            <h1 style={{ marginBottom: '4px' }}>League</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: '16px' }}>{activeLeague?.name}</p>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
                <button style={tabStyle('settings')} onClick={() => setTab('settings')}>Team Settings</button>
                <button style={tabStyle('rosters')} onClick={() => setTab('rosters')}>Rosters</button>
                <button style={tabStyle('history')} onClick={() => setTab('history')}>League History</button>
                <button style={tabStyle('commissioner')} onClick={() => setTab('commissioner')}>Commissioner</button>
            </div>

            {/* ── Team Settings Tab ── */}
            {tab === 'settings' && (
                settingsLoading ? <p>Loading...</p> : (
                    <form onSubmit={handleSaveSettings} style={{ maxWidth: '500px' }}>
                        {/* ── Team Identity Card ── */}
                        <div style={card}>
                            <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '16px' }}>Team Identity</h3>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={labelStyle}>Team Name</label>
                                <input style={inputStyle} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Mambas" />
                            </div>
                            <div style={{ marginBottom: '8px' }}>
                                <label style={labelStyle}>Avatar URL</label>
                                <input style={inputStyle} value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
                            </div>
                            {avatarUrl && (
                                <img src={avatarUrl} alt="Avatar preview" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', marginTop: '12px', border: '2px solid var(--border)' }} />
                            )}
                        </div>
                        {message && <p style={{ color: message === 'Saved!' ? 'var(--accent)' : 'var(--danger)', marginBottom: '12px' }}>{message}</p>}
                        {/* ── Save Button ── */}
                        <button type="submit" disabled={saving} style={{ backgroundColor: 'var(--accent-sec)', color: 'var(--btn-text)', border: 'none', borderRadius: 'var(--radius)', padding: '12px 24px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}>
                            {saving ? 'Saving...' : 'Save Team Settings'}
                        </button>
                    </form>
                )
            )}

            {/* ── Rosters Tab ── */}
            {tab === 'rosters' && (
                rostersLoading ? <p>Loading rosters...</p> : (
                    <>
                        {/* ── Member Roster Cards ── */}
                        {rosters.map(member => (
                            <div key={member.user_id} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginBottom: '12px', overflow: 'hidden' }}>
                                <div
                                    style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', cursor: 'pointer', justifyContent: 'space-between' }}
                                    onClick={() => setExpanded(expanded === member.user_id ? null : member.user_id)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {member.avatar_url ? (
                                            <img src={member.avatar_url} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 'bold', fontSize: '14px' }}>
                                                {member.team_name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <div style={{ color: 'var(--text)', fontWeight: 'bold', fontSize: '15px' }}>{member.team_name}</div>
                                            <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{member.roster.length} players</div>
                                        </div>
                                    </div>
                                    <span style={{ color: 'var(--text-dim)', fontSize: '18px' }}>{expanded === member.user_id ? '▲' : '▼'}</span>
                                </div>
                                {/* ── Expanded Player List ── */}
                                {expanded === member.user_id && (
                                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 20px' }}>
                                        {POSITION_ORDER.map(pos => {
                                            const players = sortedRoster(member.roster).filter(p => p.position === pos)
                                            if (players.length === 0) return null
                                            return (
                                                <div key={pos} style={{ marginBottom: '12px' }}>
                                                    <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{pos}</div>
                                                    {players.map(p => (
                                                        <div key={p.player_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '14px' }}>
                                                            <span style={{ color: 'var(--text)' }}>{p.name}</span>
                                                            <span style={{ color: 'var(--text-dim)' }}>{p.nfl_team || '—'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )
            )}

            {/* ── League History Tab ── */}
            {tab === 'history' && (
                historyLoading ? <p>Loading history...</p> : (
                    <>
                        {history.length === 0 && (
                            <div style={card}><p style={{ color: 'var(--text-dim)' }}>No history yet. Check back after the season ends.</p></div>
                        )}
                        {/* ── Season Cards ── */}
                        {history.map(season => (
                            <div key={season.season} style={card}>
                                <div style={{ fontFamily: "'Oswald', sans-serif", color: 'var(--text-heading)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>{season.season} Season</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Champion</div>
                                        <div style={{ color: 'var(--text)', fontWeight: 'bold' }}>{season.champion?.team_name || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>High Scorer</div>
                                        <div style={{ color: 'var(--text)', fontWeight: 'bold' }}>{season.high_scorer?.team_name || '—'}</div>
                                        {season.high_scorer && <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>{season.high_scorer.points.toFixed(1)} pts</div>}
                                    </div>
                                </div>
                                {season.awards.length > 0 && (
                                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
                                        <div style={{ color: 'var(--text-dim)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>Awards</div>
                                        {season.awards.map(a => (
                                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                                                <span style={{ color: 'var(--text)', fontSize: '14px' }}>{a.award_name} — <span style={{ color: 'var(--accent)' }}>{a.team_name}</span></span>
                                                {isCommissioner && (
                                                    <button onClick={() => handleDeleteAward(a.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '12px' }}>Remove</button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* ── Add Award Form ── */}
                        {isCommissioner && (
                            <div style={card}>
                                <div style={{ fontFamily: "'Oswald', sans-serif", color: 'var(--text-heading)', fontSize: '11px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '16px' }}>Add Award</div>
                                <form onSubmit={handleAddAward}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={labelStyle}>Season</label>
                                            <input
                                                type="number"
                                                value={newAwardSeason}
                                                onChange={e => setNewAwardSeason(Number(e.target.value))}
                                                style={{ display: 'block', width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', color: 'var(--text)', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Award Name</label>
                                            <input
                                                value={newAwardName}
                                                onChange={e => setNewAwardName(e.target.value)}
                                                placeholder="e.g. MVP"
                                                style={{ display: 'block', width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', color: 'var(--text)', fontSize: '14px', marginTop: '4px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={labelStyle}>Recipient</label>
                                        <select
                                            value={newAwardUser}
                                            onChange={e => setNewAwardUser(e.target.value)}
                                            style={{ display: 'block', width: '100%', backgroundColor: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', color: 'var(--text)', fontSize: '14px', marginTop: '4px' }}
                                        >
                                            <option value="">— Select member —</option>
                                            {members.map(m => <option key={m.user_id} value={m.user_id}>{m.team_name}</option>)}
                                        </select>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={awardSaving}
                                        style={{ backgroundColor: 'var(--accent-sec)', color: 'var(--btn-text)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        {awardSaving ? 'Adding...' : 'Add Award'}
                                    </button>
                                </form>
                            </div>
                        )}


                    </>
                )
            )}

            {/* ── Commissioner Tab ── */}
            {tab === 'commissioner' && (
                <div>
                    {/* ── Bot Persona Selector ── */}
                    <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '8px' }}>AI Bot Persona</h3>
                    <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>
                        {isCommissioner ? "Choose the bot's personality for league chat." : 'Only the commissioner can change the bot persona.'}
                    </p>
                    {[
                        { key: 'commissioner', label: 'Commissioner', desc: 'Stephen A. Smith energy. Confident, opinionated, trash-talky.' },
                        { key: 'funny', label: 'Hype Bot', desc: 'Chaotic hype man. Roasts managers. Kevin Hart meets Bill Simmons.' },
                        { key: 'anime', label: 'Sensei Bot', desc: 'DBZ / One Piece / MHA only. Plus Ultra. Straw Hat Pirates energy.' },
                    ].map(p => (
                        <div
                            key={p.key}
                            onClick={() => handleSavePersona(p.key)}
                            style={{
                                padding: '14px 16px',
                                marginBottom: '8px',
                                borderRadius: 'var(--radius)',
                                border: `1px solid ${botPersona === p.key ? 'var(--accent)' : 'var(--border)'}`,
                                backgroundColor: botPersona === p.key ? 'var(--accent-dark)' : 'var(--bg-input)',
                                cursor: isCommissioner ? 'pointer' : 'default',
                                opacity: personaSaving ? 0.6 : 1,
                            }}
                        >
                            <div style={{
                                color: botPersona === p.key ? 'var(--accent)' : 'var(--text)',
                                fontWeight: 'bold',
                                marginBottom: '4px',
                            }}>
                                {p.label}
                            </div>
                            <div style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                                {p.desc}
                            </div>
                        </div>
                    ))}
                    {isCommissioner && (
                        <>
                            <div style={{ fontSize: '13px', marginTop: '8px', minHeight: '20px', color: personaSaved ? 'var(--accent)' : 'var(--text-dim)' }}>
                                {personaSaving ? 'Saving...' : personaSaved ? '✓ Saved' : 'Click a persona to select and save'}
                            </div>

                            {/* ── ESPN Import Form ── */}
                            <div style={{ marginTop: '24px' }}>
                                <h3 style={{ color: 'var(--text-heading)', fontFamily: "'Oswald', sans-serif", marginBottom: '8px' }}>Import ESPN History</h3>
                                <p style={{ color: 'var(--text-dim)', fontSize: '13px', marginBottom: '16px' }}>
                                    Pull past season champion and high scorer from ESPN Fantasy. For private leagues,
                                    get your cookies from browser devtools while logged into ESPN.
                                </p>
                                <form onSubmit={handleESPNImport}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                        <div>
                                            <label style={labelStyle}>ESPN League ID</label>
                                            <input
                                                style={inputStyle}
                                                value={espnLeagueId}
                                                onChange={e => setEspnLeagueId(e.target.value)}
                                                placeholder="e.g. 1234567"
                                            />
                                        </div>
                                        <div>
                                            <label style={labelStyle}>Season Year</label>
                                            <input
                                                type="number"
                                                style={inputStyle}
                                                value={espnSeason}
                                                onChange={e => setEspnSeason(Number(e.target.value))}
                                                min={2010}
                                                max={2025}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={labelStyle}>espn_s2 Cookie (private leagues only)</label>
                                        <input
                                            style={inputStyle}
                                            value={espnS2}
                                            onChange={e => setEspnS2(e.target.value)}
                                            placeholder="Optional"
                                        />
                                    </div>
                                    <div style={{ marginBottom: '12px' }}>
                                        <label style={labelStyle}>SWID Cookie (private leagues only)</label>
                                        <input
                                            style={inputStyle}
                                            value={espnSwid}
                                            onChange={e => setEspnSwid(e.target.value)}
                                            placeholder="Optional — include curly braces"
                                        />
                                    </div>
                                    {importMessage && (
                                        <p style={{
                                            color: importMessage.includes('failed') || importMessage.includes('Failed')
                                                ? 'var(--danger)'
                                                : 'var(--accent)',
                                            fontSize: '13px',
                                            marginBottom: '12px',
                                        }}>
                                            {importMessage}
                                        </p>
                                    )}
                                    {/* ── Import Button ── */}
                                    <button
                                        type="submit"
                                        disabled={importing || !espnLeagueId}
                                        style={{
                                            backgroundColor: importing || !espnLeagueId ? 'var(--border)' : 'var(--accent)',
                                            color: importing || !espnLeagueId ? 'var(--text-dim)' : '#000',
                                            border: 'none',
                                            borderRadius: 'var(--radius)',
                                            padding: '10px 20px',
                                            fontWeight: 'bold',
                                            cursor: importing || !espnLeagueId ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {importing ? 'Importing...' : 'Import Season'}
                                    </button>
                                </form>
                            </div>
                        </>
                    )}



                </div>
            )}
            </div>
        </div>
    )
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────
// default export is declared on the function above
