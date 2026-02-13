import { FC, memo } from 'react'
import './app.scss'

import { SocketProvider } from '../shared/SocketContext'
import { NetworkProvider } from '../shared/NetworkContext'
import { StreamsProvider } from '../shared/StreamsContext'
import { Layout } from '../Layout/Layout'

export const App: FC<{ rippledUrl: string }> = memo(
  ({ rippledUrl }: { rippledUrl: string }) => (
    <SocketProvider rippledUrl={rippledUrl}>
      <NetworkProvider rippledUrl={rippledUrl}>
        <StreamsProvider>
          <Layout />
        </StreamsProvider>
      </NetworkProvider>
    </SocketProvider>
  ),
)
