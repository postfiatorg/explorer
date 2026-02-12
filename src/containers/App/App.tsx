import { FC, memo } from 'react'
import './app.scss'

import { SocketProvider } from '../shared/SocketContext'
import { NetworkProvider } from '../shared/NetworkContext'
import { ThemeProvider } from '../shared/ThemeContext'
import { StreamsProvider } from '../shared/StreamsContext'
import { Layout } from '../Layout/Layout'

export const App: FC<{ rippledUrl: string }> = memo(
  ({ rippledUrl }: { rippledUrl: string }) => (
    <SocketProvider rippledUrl={rippledUrl}>
      <NetworkProvider rippledUrl={rippledUrl}>
        <ThemeProvider>
          <StreamsProvider>
            <Layout />
          </StreamsProvider>
        </ThemeProvider>
      </NetworkProvider>
    </SocketProvider>
  ),
)
