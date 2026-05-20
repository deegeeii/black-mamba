// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── TYPES ──────────────────────────────────────────────────────────────────────
type League = {
    id: string
    name: string
    commissioner_id: string
    scoring_type: string
}

type Member = {
    user_id: string
    team_name: string
}

type LeagueContextType = {
    leagues: League[]
    activeLeague: League | null
    setActiveLeague: (l: League) => void
    members: Member[]
    getTeamName: (userId: string | null) => string
    refreshLeagues: () => void
    leaguesLoaded: boolean
}


// ── CONTEXT ────────────────────────────────────────────────────────────────────
const LeagueContext = createContext<LeagueContextType>({
    leagues: [],
    activeLeague: null,
    setActiveLeague: () => {},
    members: [],
    getTeamName: () => 'Unknown',
    refreshLeagues: () => {},
    leaguesLoaded: false,

})

// ── PROVIDER ───────────────────────────────────────────────────────────────────
export function LeagueProvider({ children, userId }: { children: React.ReactNode, userId: string | null }) {
    const [leagues, setLeagues] = useState<League[]>([])
    const [activeLeague, setActiveLeague] = useState<League | null>(null)
    const [members, setMembers] = useState<Member[]>([])
    const [leaguesLoaded, setLeaguesLoaded] = useState(false)


    // ── Effects ────────────────────────────────────────────────────────────────
    const refreshLeagues = useCallback(() => {
        if (!userId) return
        supabase
            .from('league_members')
            .select('league_id, leagues(id, name, commissioner_id, scoring_type)')
            .eq('user_id', userId)
            .then(({ data }) => {
                const list = (data || []).map((r: any) => r.leagues).filter(Boolean)
                setLeagues(list)
                setLeaguesLoaded(true)
                if (list.length > 0 && !activeLeague) setActiveLeague(list[0])
            })
    }, [userId])
    
    useEffect(() => { refreshLeagues() }, [userId])
    

    useEffect(() => {
        if (!activeLeague) return
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) return
            fetch(`${process.env.EXPO_PUBLIC_API_URL}/leagues/${activeLeague.id}/members`, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            })
                .then(r => r.json())
                .then(data => setMembers(data))
        })
    }, [activeLeague?.id])

    // ── Helpers ────────────────────────────────────────────────────────────────
    const getTeamName = useCallback((userId: string | null) => {
        if (!userId) return 'Open'
        return members.find(m => m.user_id === userId)?.team_name || userId.slice(0, 8)
    }, [members])

    return (
        <LeagueContext.Provider value={{ leagues, activeLeague, setActiveLeague, members, getTeamName, refreshLeagues, leaguesLoaded }}>
            {children}
        </LeagueContext.Provider>
    )
}

// ── HOOK ───────────────────────────────────────────────────────────────────────
export const useLeague = () => useContext(LeagueContext)
