import { FC, useState, useCallback, createContext, useContext } from 'react'
import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar/TopBar'
import { Sidebar } from './Sidebar/Sidebar'
import { StatusBar } from './StatusBar/StatusBar'
import './layout.scss'

interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
})

export const useSidebarContext = () => useContext(SidebarContext)

const COLLAPSED_KEY = 'sidebar-collapsed'

function getInitialCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === 'true'
  } catch {
    return false
  }
}

export const Layout: FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [collapsed, setCollapsedState] = useState(getInitialCollapsed)

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value)
    try {
      localStorage.setItem(COLLAPSED_KEY, String(value))
    } catch {
      // localStorage unavailable
    }
  }, [])

  const handleMenuClick = useCallback(() => {
    setMobileMenuOpen((prev) => !prev)
  }, [])

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false)
  }, [])

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      <div className={`layout ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
        <TopBar onMenuClick={handleMenuClick} />
        <Sidebar />
        {mobileMenuOpen && (
          <>
            <div
              className="sidebar-overlay"
              onClick={closeMobileMenu}
              role="presentation"
            />
            <aside className="sidebar-mobile">
              <Sidebar onNavigate={closeMobileMenu} />
            </aside>
          </>
        )}
        <main className="layout-content">
          <Outlet />
        </main>
        <StatusBar />
      </div>
    </SidebarContext.Provider>
  )
}
