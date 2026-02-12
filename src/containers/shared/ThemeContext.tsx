import { createContext, useContext, FC, ReactNode } from 'react'
import { useTheme } from './hooks/useTheme'

type ThemeContextValue = ReturnType<typeof useTheme>

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
})

export const ThemeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const value = useTheme()
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export const useThemeContext = () => useContext(ThemeContext)

export default ThemeContext
