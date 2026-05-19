// ── IMPORTS ────────────────────────────────────────────────────────────────────
import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from "../lib/supabase";

// ── INTERFACES / TYPES ─────────────────────────────────────────────────────────
interface AuthContextType {
    user: User | null
    session: Session | null
    loading: boolean
    signOut: () => Promise<void>
}

// ── CONTEXT / PROVIDER SETUP ───────────────────────────────────────────────────
const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {

    // ── STATE ───────────────────────────────────────────────────────────────────
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    // ── EFFECTS / FETCH ON MOUNT ────────────────────────────────────────────────
    useEffect(() => {
        // Get the current session on load
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            setLoading(false)
        })

        // Listen for auth changes (login logout, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session)
                setUser(session?.user ?? null)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    // ── HANDLERS ────────────────────────────────────────────────────────────────
    const signOut = async () => {
        await supabase.auth.signOut()
    }

    // ── JSX / RENDER ────────────────────────────────────────────────────────────
    return (
        <AuthContext.Provider value={{ user, session, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

// ── EXPORT ─────────────────────────────────────────────────────────────────────
export const useAuth = () => useContext(AuthContext)
