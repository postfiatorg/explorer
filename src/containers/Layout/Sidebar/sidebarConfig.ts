import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Github,
  ExternalLink,
  Cpu,
  Shield,
  ArrowUpCircle,
  FileText,
} from 'lucide-react'

export interface SidebarItem {
  label: string
  icon: typeof LayoutDashboard
  path?: string
  href?: string
}

export const sidebarConfig: SidebarItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Transactions', icon: ArrowLeftRight, path: '/transactions' },
  { label: 'Nodes', icon: Cpu, path: '/network/nodes' },
  { label: 'Validators', icon: Shield, path: '/network/validators' },
  { label: 'Amendments', icon: FileText, path: '/amendments' },
  {
    label: 'Upgrade Status',
    icon: ArrowUpCircle,
    path: '/network/upgrade-status',
  },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
]

export const sidebarFooterLinks: SidebarItem[] = [
  {
    label: 'GitHub',
    icon: Github,
    href: 'https://github.com/postfiatorg/explorer',
  },
  { label: 'PostFiat.org', icon: ExternalLink, href: 'https://postfiat.org' },
]
