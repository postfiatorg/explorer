import { FC, useContext } from 'react'
import { Wifi, WifiOff, Activity } from 'lucide-react'
import { useIsOnline } from '../../shared/SocketContext'
import NetworkContext from '../../shared/NetworkContext'
import './statusbar.scss'

export const StatusBar: FC = () => {
  const { isOnline } = useIsOnline()
  const network = useContext(NetworkContext)

  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        <span className={`statusbar-connection ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          {isOnline ? 'Connected' : 'Disconnected'}
        </span>
        <span className="statusbar-divider" />
        <span className="statusbar-network">{network}</span>
      </div>
      <div className="statusbar-right">
        <span className="statusbar-ledger">
          <Activity size={14} />
          <span className="statusbar-ledger-label">Ledger</span>
          <span className="statusbar-ledger-value" id="statusbar-ledger-index">—</span>
        </span>
      </div>
    </footer>
  )
}
