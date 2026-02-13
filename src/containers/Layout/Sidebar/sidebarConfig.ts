import {
  LayoutDashboard,
  ArrowLeftRight,

  BarChart3,
  Code2,
  Github,
  ExternalLink,
  Cpu,
  Shield,
  ArrowUpCircle,
  Ban,
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
  { label: 'Upgrade Status', icon: ArrowUpCircle, path: '/network/upgrade-status' },
  { label: 'Exclusions', icon: Ban, path: '/network/exclusions' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'Developers', icon: Code2, path: '/developers' },
]

export const sidebarFooterLinks: SidebarItem[] = [
  { label: 'GitHub', icon: Github, href: 'https://github.com/postfiatorg/explorer' },
  { label: 'PostFiat.org', icon: ExternalLink, href: 'https://postfiat.org' },
]
