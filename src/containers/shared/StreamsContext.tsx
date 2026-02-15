import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useQuery } from 'react-query'
import axios from 'axios'
import Streams from './components/Streams'
import { useIsOnline } from './SocketContext'
import NetworkContext from './NetworkContext'
import Log from './log'
import { FETCH_INTERVAL_ERROR_MILLIS } from './utils'

const FETCH_INTERVAL_MILLIS = 5 * 60 * 1000
const MAX_TRANSACTIONS = 100
const MAX_METRICS_HISTORY = 1000

interface ValidatorResponse {
  signing_key: string
  unl?: string
  [key: string]: any
}

interface MetricsSnapshot {
  timestamp: number
  base_fee?: string
  txn_sec?: string
  txn_ledger?: string
  ledger_interval?: string
  avg_fee?: string
  load_fee?: string
  quorum?: number
  nUnl?: any[]
  [key: string]: any
}

interface StreamsContextValue {
  ledgers: any[]
  metrics: any
  validators: any[]
  latestTransactions: any[]
  metricsHistory: MetricsSnapshot[]
  currentLedgerIndex: number | null
  externalValidators: Record<string, ValidatorResponse>
  unlCount: number | undefined
}

const defaultValue: StreamsContextValue = {
  ledgers: [],
  metrics: {},
  validators: [],
  latestTransactions: [],
  metricsHistory: [],
  currentLedgerIndex: null,
  externalValidators: {},
  unlCount: undefined,
}

const StreamsContext = createContext<StreamsContextValue>(defaultValue)

export const StreamsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { isOnline } = useIsOnline()
  const network = useContext(NetworkContext)

  const [ledgers, setLedgersState] = useState<any[]>([])
  const [metrics, setMetricsState] = useState<any>({})
  const [validators, setValidatorsState] = useState<any[]>([])
  const [latestTransactions, setLatestTransactions] = useState<any[]>([])
  const [metricsHistory, setMetricsHistory] = useState<MetricsSnapshot[]>([])
  const [currentLedgerIndex, setCurrentLedgerIndex] = useState<number | null>(
    null,
  )

  const [externalValidators, setExternalValidators] = useState<
    Record<string, ValidatorResponse>
  >({})
  const [unlCount, setUnlCount] = useState<number | undefined>(undefined)

  const seenLedgerIndicesRef = useRef<Set<number>>(new Set())

  const fetchValidators = useCallback(() => {
    const url = `${process.env.VITE_DATA_URL}/validators/${network}`
    return axios
      .get(url)
      .then((resp) => resp.data.validators)
      .then((validatorResponse: ValidatorResponse[]) => {
        const newValidators: Record<string, ValidatorResponse> = {}
        let count = 0
        validatorResponse.forEach((v) => {
          if (v.unl === process.env.VITE_VALIDATOR) {
            count += 1
          }
          newValidators[v.signing_key] = v
        })
        setExternalValidators(newValidators)
        setUnlCount(count)
        return true
      })
      .catch((e) => Log.error(e))
  }, [network])

  useQuery(['fetchValidatorData'], fetchValidators, {
    refetchInterval: (returnedData) =>
      returnedData == null
        ? FETCH_INTERVAL_ERROR_MILLIS
        : FETCH_INTERVAL_MILLIS,
    refetchOnMount: true,
    enabled: !!network,
  })

  const handleLedgersUpdate = useCallback((newLedgers: any[]) => {
    setLedgersState(newLedgers)

    if (newLedgers.length > 0) {
      const latest = newLedgers[0]
      setCurrentLedgerIndex(latest.ledger_index)

      // Extract transactions from ledgers that have transaction summaries
      const ledgerIndex = latest.ledger_index
      if (
        latest.transactions &&
        Array.isArray(latest.transactions) &&
        !seenLedgerIndicesRef.current.has(ledgerIndex)
      ) {
        seenLedgerIndicesRef.current.add(ledgerIndex)
        // Prevent unbounded growth
        if (seenLedgerIndicesRef.current.size > 200) {
          const entries = Array.from(seenLedgerIndicesRef.current)
          entries
            .slice(0, entries.length - 100)
            .forEach((idx) => seenLedgerIndicesRef.current.delete(idx))
        }

        const newTxns = latest.transactions.map((tx: any) => ({
          ...tx,
          ledger_index: ledgerIndex,
          close_time: latest.close_time,
        }))

        setLatestTransactions((prev) =>
          [...newTxns, ...prev].slice(0, MAX_TRANSACTIONS),
        )
      }
    }
  }, [])

  const handleMetricsUpdate = useCallback((newMetrics: any) => {
    setMetricsState(newMetrics)
    setMetricsHistory((prev) =>
      [...prev, { timestamp: Date.now(), ...newMetrics }].slice(
        -MAX_METRICS_HISTORY,
      ),
    )
  }, [])

  const handleValidatorsUpdate = useCallback((newValidators: any) => {
    setValidatorsState(newValidators)
  }, [])

  // Update statusbar ledger index directly for performance
  if (currentLedgerIndex != null) {
    const el = document.getElementById('statusbar-ledger-index')
    if (el) el.textContent = currentLedgerIndex.toLocaleString()
  }

  const contextValue = useMemo(
    () => ({
      ledgers,
      metrics,
      validators,
      latestTransactions,
      metricsHistory,
      currentLedgerIndex,
      externalValidators,
      unlCount,
    }),
    [
      ledgers,
      metrics,
      validators,
      latestTransactions,
      metricsHistory,
      currentLedgerIndex,
      externalValidators,
      unlCount,
    ],
  )

  return (
    <StreamsContext.Provider value={contextValue}>
      {isOnline && (
        <Streams
          validators={externalValidators}
          updateLedgers={handleLedgersUpdate}
          updateMetrics={handleMetricsUpdate}
          updateValidators={handleValidatorsUpdate}
        />
      )}
      {children}
    </StreamsContext.Provider>
  )
}

export const useStreams = () => useContext(StreamsContext)

export default StreamsContext
