import { FC } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { sidebarConfig, sidebarFooterLinks, SidebarItem } from './sidebarConfig'
import { useSidebarContext } from '../SidebarContext'
import './sidebar.scss'

interface SidebarNavItemProps {
  item: SidebarItem
  collapsed: boolean
  pathname: string
  onNavigate?: () => void
}

const SidebarNavItem: FC<SidebarNavItemProps> = ({
  item,
  collapsed,
  pathname,
  onNavigate,
}) => {
  const isActive =
    item.path === '/'
      ? pathname === '/'
      : item.path && pathname.startsWith(item.path)

  const Icon = item.icon

  if (item.href) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="sidebar-item sidebar-link"
        title={collapsed ? item.label : undefined}
      >
        <Icon size={20} />
        {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
      </a>
    )
  }

  return (
    <Link
      to={item.path || '/'}
      className={`sidebar-item ${isActive ? 'active' : ''}`}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
    >
      <Icon size={20} />
      {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
    </Link>
  )
}

interface SidebarProps {
  onNavigate?: () => void
}

export const Sidebar: FC<SidebarProps> = ({ onNavigate }) => {
  const { collapsed, setCollapsed } = useSidebarContext()
  const { pathname } = useLocation()

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <div className="sidebar-main">
          {sidebarConfig.map((item) => (
            <SidebarNavItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </div>
        <div className="sidebar-footer">
          {sidebarFooterLinks.map((item) => (
            <SidebarNavItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
          <button
            type="button"
            className="sidebar-item sidebar-collapse-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
            {!collapsed && <span className="sidebar-item-label">Collapse</span>}
          </button>
        </div>
      </nav>
    </aside>
  )
}
