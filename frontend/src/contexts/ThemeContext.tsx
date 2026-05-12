import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from './AuthContext'
import axios from 'axios'


const API_URL = import.meta.env.VITE_API_URL


type Theme = 'dark' | 'light'

interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    toggleTheme: () => {}
})

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { session } = useAuth()
    const [theme, setTheme] = useState<Theme>('dark')

    useEffect(() => {
        if (!session?.access_token) return
        const headers = { Authorization: `Bearer ${session.access_token}` }
        axios.get(`${API_URL}/profile`, { headers }).then(res => {
            const saved = res.data.theme_preference 
            if (saved === 'light' || saved === 'dark') {
                setTheme(saved)
                document.documentElement.dataset.theme = saved
            }
        })
    }, [session?.access_token])

    const toggleTheme = () => {
        const next: Theme = theme === 'dark' ? 'light' : 'dark'
        setTheme(next)
        document.documentElement.dataset.theme = next
        if (!session?.access_token) return
        const headers = { Authorization: `Bearer ${session.access_token}` }
        axios.patch(`${API_URL}/profile`, { theme_preference: next }, { headers })
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)