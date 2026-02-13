import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../../shared/components/StatusBadge/StatusBadge'

interface Props {
  flags: string[]
}

export const Settings = ({ flags }: Props) => {
  const { t } = useTranslation()

  const locked = flags.includes('lsfMPTLocked')
  const canLock = flags.includes('lsfMPTCanLock')
  const requireAuth = flags.includes('lsfMPTRequireAuth')
  const canEscrow = flags.includes('lsfMPTCanEscrow')
  const canTrade = flags.includes('lsfMPTCanTrade')
  const canTransfer = flags.includes('lsfMPTCanTransfer')
  const canClawback = flags.includes('lsfMPTCanClawback')

  const FLAG_MAP = [
    { key: 'locked', value: locked },
    { key: 'can_lock', value: canLock },
    { key: 'require_auth', value: requireAuth },
    { key: 'can_escrow', value: canEscrow },
    { key: 'can_trade', value: canTrade },
    { key: 'can_transfer', value: canTransfer },
    { key: 'can_clawback', value: canClawback },
  ]

  return (
    <div className="mpt-settings-list">
      {FLAG_MAP.map(({ key, value }) => (
        <div key={key} className="mpt-setting-row">
          <span className="mpt-setting-label">{t(key)}</span>
          <StatusBadge
            status={value ? 'enabled' : 'disabled'}
            label={value ? 'Enabled' : 'Disabled'}
          />
        </div>
      ))}
    </div>
  )
}
