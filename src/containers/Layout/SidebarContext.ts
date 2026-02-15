import { createContext, useContext } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  setCollapsed: (collapsed: boolean) => void
}

export const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  setCollapsed: () => {},
})

export const useSidebarContext = () => useContext(SidebarContext)
