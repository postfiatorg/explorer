import { FC, useContext } from 'react'
import { Shield, Globe, Users } from 'lucide-react'
import { useStreams } from '../../shared/hooks/useStreams'
import NetworkContext from '../../shared/NetworkContext'

export const NetworkHealth: FC = () => {
  const { metrics, validators } = useStreams()
  const network = useContext(NetworkContext)

  return (
    <div className="network-health">
      <div className="network-health-item">
        <Users size={16} />
        <span className="network-health-label">Validators</span>
        <span className="network-health-value">
          {validators?.length || '—'}
        </span>
      </div>
      <div className="network-health-divider" />
      <div className="network-health-item">
        <Shield size={16} />
        <span className="network-health-label">Quorum</span>
        <span className="network-health-value">{metrics?.quorum || '—'}</span>
      </div>
      <div className="network-health-divider" />
      <div className="network-health-item">
        <Globe size={16} />
        <span className="network-health-label">Network</span>
        <span className="network-health-value network-health-network">
          {network}
        </span>
      </div>
    </div>
  )
}
