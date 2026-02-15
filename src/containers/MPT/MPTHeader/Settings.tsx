import { StatusBadge } from '../../shared/components/StatusBadge/StatusBadge'

interface Props {
  flags: string[]
}

const FLAG_MAP = [
  { flag: 'lsfMPTLocked', label: 'Locked' },
  { flag: 'lsfMPTCanLock', label: 'Can Lock' },
  { flag: 'lsfMPTRequireAuth', label: 'Require Auth' },
  { flag: 'lsfMPTCanEscrow', label: 'Can Escrow' },
  { flag: 'lsfMPTCanTrade', label: 'Can Trade' },
  { flag: 'lsfMPTCanTransfer', label: 'Can Transfer' },
  { flag: 'lsfMPTCanClawback', label: 'Can Clawback' },
]

export const Settings = ({ flags }: Props) => (
  <div className="mpt-flags-grid">
    {FLAG_MAP.map(({ flag, label }) => {
      const isSet = flags.includes(flag)
      return (
        <div className="mpt-flag-item" key={flag}>
          <span className="mpt-flag-label">{label}</span>
          <StatusBadge
            status={isSet ? 'enabled' : 'disabled'}
            label={isSet ? 'Enabled' : 'Disabled'}
          />
        </div>
      )
    })}
  </div>
)
