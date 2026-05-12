import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL

interface League {
    id: string
    name: string
}

interface LeagueContextType {
    leagues: League[]
    activeLeague: League | null
    setActiveLeague: (league: League) => void
}

const LeagueContext = createContext<LeagueContextType>({
    leagues: [],
    activeLeague: null,
    setActiveLeague: () => {}
})

export function LeagueProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth()
    const [leagues, setLeagues] = useState<League[]>([])
    const [activeLeague, setActiveLeague] = useState<League | null>(null)

    useEffect(() => {
        if (!session?.access_token) return
        const headers = { Authorization: `Bearer ${session.access_token}` }
        axios.get(`${API_URL}/leagues/`, { headers }).then(res => {
            setLeagues(res.data)
            if (res.data.length > 0 && !activeLeague) {
                setActiveLeague(res.data[0])
            }
        })
    }, [session?.access_token])

    return (
        <LeagueContext.Provider value={{ leagues, activeLeague, setActiveLeague }}>
            {children}
        </LeagueContext.Provider>
    )
}

export const useLeague = () => useContext(LeagueContext)