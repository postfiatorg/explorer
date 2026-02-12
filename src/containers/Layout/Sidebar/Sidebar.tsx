import { FC, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PanelLeftClose, PanelLeftOpen, ChevronDown } from 'lucide-react'
import { sidebarConfig, sidebarFooterLinks, SidebarItem } from './sidebarConfig'
import { useSidebarContext } from '../Layout'
import './sidebar.scss'

interface SidebarNavItemProps {
  item: SidebarItem
  collapsed: boolean
  pathname: string
}

const SidebarNavItem: FC<SidebarNavItemProps> = ({ item, collapsed, pathname }) => {
  const [expanded, setExpanded] = useState(() => {
    if (!item.children) return false
    return item.children.some((child) => child.path && pathname.startsWith(child.path))
  })

  const isActive = item.path === '/'
    ? pathname === '/'
    : item.path && pathname.startsWith(item.path)

  const isGroupActive = item.children?.some(
    (child) => child.path && pathname.startsWith(child.path),
  )

  const Icon = item.icon

  if (item.children) {
    return (
      <div className={`sidebar-group ${isGroupActive ? 'active' : ''}`}>
        <button
          type="button"
          className={`sidebar-item sidebar-group-toggle ${isGroupActive ? 'active' : ''}`}
          onClick={() => setExpanded(!expanded)}
          title={collapsed ? item.label : undefined}
        >
          <Icon size={20} />
          {!collapsed && (
            <>
              <span className="sidebar-item-label">{item.label}</span>
              <ChevronDown
                size={14}
                className={`sidebar-chevron ${expanded ? 'expanded' : ''}`}
              />
            </>
          )}
        </button>
        {(expanded || collapsed) && (
          <div className={`sidebar-children ${collapsed ? 'collapsed-children' : ''}`}>
            {item.children.map((child) => (
              <SidebarNavItem
                key={child.label}
                item={child}
                collapsed={collapsed}
                pathname={pathname}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

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
    >
      <Icon size={20} />
      {!collapsed && <span className="sidebar-item-label">{item.label}</span>}
    </Link>
  )
}

export const Sidebar: FC = () => {
  const { collapsed, setCollapsed } = useSidebarContext()
  const { pathname } = useLocation()

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <div className="sidebar-main">
          {sidebarConfig.map((item) => (
            <SidebarNavItem key={item.label} item={item} collapsed={collapsed} pathname={pathname} />
          ))}
        </div>
        <div className="sidebar-footer">
          {sidebarFooterLinks.map((item) => (
            <SidebarNavItem key={item.label} item={item} collapsed={collapsed} pathname={pathname} />
          ))}
          <button
            type="button"
            className="sidebar-item sidebar-collapse-toggle"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            {!collapsed && <span className="sidebar-item-label">Collapse</span>}
          </button>
        </div>
      </nav>
    </aside>
  )
}
