import { FC } from 'react'
import './statusBadge.scss'

type BadgeStatus = 'enabled' | 'disabled' | 'voting' | 'vetoed' | 'verified' | 'deprecated'

interface StatusBadgeProps {
  status: BadgeStatus
  label: string
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, label }) => (
  <span className={`status-badge status-badge-${status}`}>
    {label}
  </span>
)
