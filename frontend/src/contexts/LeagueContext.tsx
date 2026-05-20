// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import axios from "axios";

// ── CONSTANTS ──────────────────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL

// ── INTERFACES / TYPES ─────────────────────────────────────────────────────────
interface League {
    id: string
    name: string
    commissioner_id?: string
    scoring_type?: string
}

interface Member {
    user_id: string
    team_name: string
}

interface LeagueContextType {
    leagues: League[]
    activeLeague: League | null
    setActiveLeague: (league: League) => void
    members: Member[]
    getTeamName: (userId: string | null) => string
    refreshLeagues: () => void
}

// ── CONTEXT / PROVIDER SETUP ───────────────────────────────────────────────────
const LeagueContext = createContext<LeagueContextType>({
    leagues: [],
    activeLeague: null,
    setActiveLeague: () => {},
    members: [],
    getTeamName: () => 'Unknown',
    refreshLeagues: () => {},
})

export function LeagueProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth()

    // ── STATE ───────────────────────────────────────────────────────────────────
    const [leagues, setLeagues] = useState<League[]>([])
    const [activeLeague, setActiveLeague] = useState<League | null>(null)
    const [members, setMembers] = useState<Member[]>([])

    // ── EFFECTS / FETCH ─────────────────────────────────────────────────────────
    const refreshLeagues = useCallback(() => {
        if (!session?.access_token) return
        const headers = { Authorization: `Bearer ${session.access_token}` }
        axios.get(`${API_URL}/leagues/`, { headers }).then(res => {
            setLeagues(res.data)
            if (res.data.length > 0 && !activeLeague) {
                setActiveLeague(res.data[0])
            }
        })
    }, [session?.access_token])

    useEffect(() => { refreshLeagues() }, [session?.access_token])

    useEffect(() => {
        if (!session?.access_token || !activeLeague) return
        const headers = { Authorization: `Bearer ${session.access_token}` }
        axios.get(`${API_URL}/leagues/${activeLeague.id}/members`, { headers }).then(res => {
            setMembers(res.data)
        })
    }, [session?.access_token, activeLeague?.id])

    // ── HELPERS ─────────────────────────────────────────────────────────────────
    const getTeamName = useCallback((userId: string | null) => {
        if (!userId) return 'Open'
        if (userId === session?.user?.id) return 'You'
        return members.find(m => m.user_id === userId)?.team_name || userId.slice(0, 8)
    }, [members, session?.user?.id])

    // ── JSX / RENDER ────────────────────────────────────────────────────────────
    return (
        <LeagueContext.Provider value={{ leagues, activeLeague, setActiveLeague, members, getTeamName, refreshLeagues }}>
            {children}
        </LeagueContext.Provider>
    )
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────
export const useLeague = () => useContext(LeagueContext)
