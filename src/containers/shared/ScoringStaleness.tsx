import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import axios, { AxiosResponse } from 'axios'

interface ScoringStalenessState {
  isStale: boolean
  lastObservedAt: number | null
}

const DEFAULT_STATE: ScoringStalenessState = {
  isStale: false,
  lastObservedAt: null,
}

const ScoringStalenessContext =
  createContext<ScoringStalenessState>(DEFAULT_STATE)

export const useScoringStaleness = (): ScoringStalenessState =>
  useContext(ScoringStalenessContext)

const isScoringUrl = (url: string | undefined): boolean =>
  typeof url === 'string' && url.startsWith('/api/scoring/')

const readStaleHeader = (response: AxiosResponse): boolean => {
  const raw = response.headers?.['x-scoring-stale']
  if (typeof raw === 'string') return raw.toLowerCase() === 'true'
  return raw === true
}

export const ScoringStalenessProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [state, setState] = useState<ScoringStalenessState>(DEFAULT_STATE)

  useEffect(() => {
    const id = axios.interceptors.response.use((response) => {
      if (isScoringUrl(response.config?.url)) {
        const stale = readStaleHeader(response)
        setState({ isStale: stale, lastObservedAt: Date.now() })
      }
      return response
    })
    return () => {
      axios.interceptors.response.eject(id)
    }
  }, [])

  const value = useMemo(() => state, [state])

  return (
    <ScoringStalenessContext.Provider value={value}>
      {children}
    </ScoringStalenessContext.Provider>
  )
}
