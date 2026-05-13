import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { darkTheme, lightTheme, Theme } from '../lib/theme'

type ThemeContextType = {
    theme: Theme
    isDark: boolean
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
    theme: darkTheme,
    isDark: true,
    toggleTheme: () => {},
})

export function ThemeProvider({ children, userId }: { children: React.ReactNode, userId: string | null }) {
    const [isDark, setIsDark] = useState(true)

    useEffect(() => {
        if (!userId) return
        supabase.from('profiles').select('theme_preference').eq('id', userId).single()
            .then(({ data }) => {
                if (data?.theme_preference) setIsDark(data.theme_preference === 'dark')
            })
    }, [userId])

    const toggleTheme = async () => {
        const next = !isDark
        setIsDark(next)
        if (userId) {
            await supabase.from('profiles').update({ theme_preference: next ? 'dark' : 'light' }).eq('id', userId)
        }
    }

    return (
        <ThemeContext.Provider value={{ theme: isDark ? darkTheme : lightTheme, isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
