import { StatusBadge } from '../../shared/components/StatusBadge/StatusBadge'

interface Props {
  flags: string[]
}

const FLAG_MAP = [
  { flag: 'lsfBurnable', label: 'Burnable' },
  { flag: 'lsfOnlyXRP', label: 'Only PFT' },
  { flag: 'lsfTransferable', label: 'Transferable' },
]

export const Settings = ({ flags }: Props) => (
  <div className="nft-flags-grid">
    {FLAG_MAP.map(({ flag, label }) => {
      const isSet = flags.includes(flag)
      return (
        <div className="nft-flag-item" key={flag}>
          <span className="nft-flag-label">{label}</span>
          <StatusBadge
            status={isSet ? 'enabled' : 'disabled'}
            label={isSet ? 'Enabled' : 'Disabled'}
          />
        </div>
      )
    })}
  </div>
)
