import { useContext, useMemo, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import Streams from '../shared/components/Streams'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { ValidatorsTable } from './ValidatorsTable'
import { MetricCard } from '../shared/components/MetricCard/MetricCard'
import Log from '../shared/log'
import {
  DROPS_TO_XRP_FACTOR,
  FETCH_INTERVAL_MILLIS,
  FETCH_INTERVAL_ERROR_MILLIS,
  FETCH_INTERVAL_FEE_SETTINGS_MILLIS,
} from '../shared/utils'
import {
  FeeSettings,
  StreamValidator,
  ValidatorResponse,
} from '../shared/vhsTypes'
import NetworkContext from '../shared/NetworkContext'
import './css/style.scss'
import { VALIDATORS_ROUTE } from '../App/routes'
import { useRouteParams } from '../shared/routing'
import ValidatorsTabs from './ValidatorsTabs'
import SocketContext from '../shared/SocketContext'
import { getServerState } from '../../rippled/lib/rippled'
import {
  ScoringContext,
  ScoringUnlResponse,
  ScoringConfig,
  ScoringRoundMeta,
  ScoresJson,
} from './scoringUtils'

const FIVE_MINUTES_MS = 5 * 60 * 1000
const ONE_HOUR_MS = 60 * 60 * 1000
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

const fetchJsonOrNull = async <T,>(url: string): Promise<T | null> => {
  try {
    const response = await axios.get<T>(url)
    return response.data
  } catch {
    return null
  }
}

export const Validators = () => {
  const { t } = useTranslation()
  const [vList, setVList] = useState<Record<string, StreamValidator>>({})
  const [feeSettings, setFeeSettings] = useState<FeeSettings | undefined>(
    undefined,
  )
  const network = useContext(NetworkContext)
  const rippledSocket = useContext(SocketContext)
  const { tab = 'uptime' } = useRouteParams(VALIDATORS_ROUTE)

  useQuery(['fetchValidatorsData'], () => fetchData(), {
    refetchInterval: (returnedData, _) =>
      returnedData == null
        ? FETCH_INTERVAL_ERROR_MILLIS
        : FETCH_INTERVAL_MILLIS,
    refetchOnMount: true,
    enabled: process.env.VITE_ENVIRONMENT !== 'custom' || !!network,
  })

  useQuery(['fetchFeeSettingsData'], () => fetchFeeSettingsData(), {
    refetchInterval: (returnedData, _) =>
      returnedData == null
        ? FETCH_INTERVAL_ERROR_MILLIS
        : FETCH_INTERVAL_FEE_SETTINGS_MILLIS,
    refetchOnMount: true,
    enabled: process.env.VITE_ENVIRONMENT !== 'custom' || !!network,
  })

  const { data: scoringUnl } = useQuery<ScoringUnlResponse | null>(
    ['scoring-unl-current'],
    () => fetchJsonOrNull<ScoringUnlResponse>('/api/scoring/unl/current'),
    {
      staleTime: FIVE_MINUTES_MS,
      refetchInterval: FIVE_MINUTES_MS,
      retry: false,
    },
  )

  const { data: scoringConfig } = useQuery<ScoringConfig | null>(
    ['scoring-config'],
    () => fetchJsonOrNull<ScoringConfig>('/api/scoring/config'),
    {
      staleTime: ONE_HOUR_MS,
      refetchInterval: ONE_HOUR_MS,
      retry: false,
    },
  )

  const roundNumber = scoringUnl?.round_number

  const { data: scoringRound } = useQuery<ScoringRoundMeta | null>(
    ['scoring-round', roundNumber],
    () =>
      fetchJsonOrNull<ScoringRoundMeta>(`/api/scoring/rounds/${roundNumber}`),
    {
      enabled: typeof roundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const { data: scoringScores } = useQuery<ScoresJson | null>(
    ['scoring-scores', roundNumber],
    () =>
      fetchJsonOrNull<ScoresJson>(
        `/api/scoring/rounds/${roundNumber}/scores.json`,
      ),
    {
      enabled: typeof roundNumber === 'number',
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  const scoringContext = useMemo<ScoringContext | null>(() => {
    if (!scoringUnl || !scoringScores || !scoringRound || !scoringConfig) {
      return null
    }
    return {
      unl: scoringUnl,
      scores: scoringScores,
      round: scoringRound,
      config: scoringConfig,
    }
  }, [scoringUnl, scoringScores, scoringRound, scoringConfig])

  function fetchFeeSettingsData() {
    if (tab === 'voting') {
      getServerState(rippledSocket).then((res) => {
        setFeeSettings({
          base_fee: res.state.validated_ledger.base_fee,
          reserve_base: res.state.validated_ledger.reserve_base,
          reserve_inc: res.state.validated_ledger.reserve_inc,
        })
      })
    }
  }

  function fetchData() {
    const url = `${process.env.VITE_DATA_URL}/validators/${network}`
    return axios
      .get(url)
      .then((resp) => resp.data.validators)
      .then((validators) => {
        const newValidatorList: Record<string, StreamValidator> = {}
        validators.forEach((v: ValidatorResponse) => {
          newValidatorList[v.signing_key] = v
        })
        setVList(newValidatorList)
        return true
      })
      .catch((e) => Log.error(e))
  }

  const updateValidators = (newValidations: StreamValidator[]) => {
    setVList((current) => {
      let changed = false
      const updated = { ...current }
      newValidations.forEach((v: any) => {
        if (updated[v.pubkey]) {
          updated[v.pubkey] = {
            ...updated[v.pubkey],
            ledger_index: v.ledger_index,
            ledger_hash: v.ledger_hash,
          }
          changed = true
        }
      })
      return changed ? updated : current
    })
  }

  const validatorCount = Object.keys(vList).length
  const validators = Object.values(vList)

  const unlCount = useMemo(() => {
    if (scoringContext) {
      return scoringContext.unl.unl.length
    }
    return validators.filter((v: any) => Boolean(v.unl)).length
  }, [scoringContext, validators])

  const averageAgreement = useMemo(() => {
    const unlKeys = scoringContext ? new Set(scoringContext.unl.unl) : null

    const unlValidators = validators.filter((v: any) => {
      if (unlKeys) {
        const key = v.master_key || v.signing_key
        return unlKeys.has(key)
      }
      return Boolean(v.unl)
    })
    const withScore = unlValidators.filter(
      (v: any) => v.agreement_30day?.score != null,
    )
    if (withScore.length === 0) return undefined
    const sum = withScore.reduce(
      (acc, v: any) => acc + Number(v.agreement_30day.score),
      0,
    )
    const avg = (sum / withScore.length) * 100
    return `${avg.toFixed(2)}%`
  }, [validators, scoringContext])

  const votingNetworkSettings = feeSettings ? (
    <div className="voting-current-settings">
      <div className="voting-settings-header">Current Network Settings</div>
      <div className="voting-settings-grid">
        {[
          {
            label: 'Base Reserve',
            value: feeSettings.reserve_base / DROPS_TO_XRP_FACTOR,
            unit: 'PFT',
          },
          {
            label: 'Owner Reserve',
            value: feeSettings.reserve_inc / DROPS_TO_XRP_FACTOR,
            unit: 'PFT',
          },
          {
            label: 'Base Fee',
            value: feeSettings.base_fee / DROPS_TO_XRP_FACTOR,
            unit: 'PFT',
          },
        ].map((item) => (
          <div className="voting-setting-card" key={item.label}>
            <span className="voting-setting-label">{item.label}</span>
            <span className="voting-setting-value">
              {item.value}
              <span className="voting-setting-unit">{item.unit}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  ) : null

  const Body = {
    uptime: (
      <ValidatorsTable
        validators={validators}
        tab="uptime"
        scoringContext={scoringContext}
      />
    ),
    voting: (
      <>
        {votingNetworkSettings}
        <ValidatorsTable
          validators={validators}
          tab="voting"
          feeSettings={feeSettings}
          scoringContext={scoringContext}
        />
      </>
    ),
  }[tab]

  return (
    <div className="network-page">
      <SEOHelmet
        title={t('validators')}
        description={t('meta.validators.description')}
        path="/network/validators"
      />
      <div className="network-page-title">{t('validators')}</div>

      {network && <Streams updateValidators={updateValidators} />}

      <div className="network-stats">
        <MetricCard label="Validators" value={validatorCount || undefined} />
        <MetricCard label="UNL Count" value={unlCount || undefined} />
        <MetricCard label="UNL 30D Agreement" value={averageAgreement} />
      </div>

      <div className="wrap">
        <ValidatorsTabs selected={tab} />
        {Body}
      </div>
    </div>
  )
}
