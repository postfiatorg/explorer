import { FC } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useThemeContext } from '../../shared/ThemeContext'
import './themeToggle.scss'

export const ThemeToggle: FC = () => {
  const { theme, toggleTheme } = useThemeContext()

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
