import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type League = {
    id: string
    name: string
}

type LeagueContextType = {
    leagues: League[]
    activeLeague: League | null
    setActiveLeague: (l: League) => void
}

const LeagueContext = createContext<LeagueContextType>({
    leagues: [],
    activeLeague: null,
    setActiveLeague: () => { },
})

export function LeagueProvider({ children, userId }: { children: React.ReactNode, userId: string | null }) {
    const [leagues, setLeagues] = useState<League[]>([])
    const [activeLeague, setActiveLeague] = useState<League | null>(null)

    useEffect(() => {
        if (!userId) return
        supabase
            .from('league_members')
            .select('league_id, leagues(id, name)')
            .eq('user_id', userId)
            .then(({ data }) => {
                const list = (data || []).map((r: any) => r.leagues).filter(Boolean)
                setLeagues(list)
                if (list.length > 0) setActiveLeague(list[0])
            })

    }, [userId])

    return (
        <LeagueContext.Provider value={{ leagues, activeLeague, setActiveLeague }}>
            {children}
        </LeagueContext.Provider>
    )
}

export const useLeague = () => useContext(LeagueContext)
