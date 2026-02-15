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
import { Hexagons } from './Hexagons'
import {
  FeeSettings,
  StreamValidator,
  ValidatorResponse,
} from '../shared/vhsTypes'
import NetworkContext from '../shared/NetworkContext'
import { TooltipProvider } from '../shared/components/Tooltip'
import './css/style.scss'
import { VALIDATORS_ROUTE } from '../App/routes'
import { useRouteParams } from '../shared/routing'
import ValidatorsTabs from './ValidatorsTabs'
import SocketContext from '../shared/SocketContext'
import { getServerState } from '../../rippled/lib/rippled'

export const Validators = () => {
  const { t } = useTranslation()
  const [vList, setVList] = useState<Record<string, StreamValidator>>({})
  const [validations, setValidations] = useState([])
  const [metrics, setMetrics] = useState({})
  const [unlCount, setUnlCount] = useState(0)
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

  function mergeLatest(
    validators: Record<string, ValidatorResponse>,
    live: Record<string, StreamValidator>,
  ): Record<string, StreamValidator> {
    const updated: Record<string, StreamValidator> = {}
    const keys = new Set(Object.keys(validators).concat(Object.keys(live)))
    keys.forEach((d: string) => {
      const newData: StreamValidator = validators[d] || live[d]
      if (newData.ledger_index == null && live[d] && live[d].ledger_index) {
        newData.ledger_index = live[d].ledger_index
        newData.ledger_hash = live[d].ledger_hash
      }
      updated[d] = newData
    })
    return updated
  }

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
        const newValidatorList: Record<string, ValidatorResponse> = {}
        validators.forEach((v: ValidatorResponse) => {
          newValidatorList[v.signing_key] = v
        })
        setVList(() => mergeLatest(newValidatorList, vList))
        setUnlCount(validators.filter((d: any) => Boolean(d.unl)).length)
        return true
      })
      .catch((e) => Log.error(e))
  }

  const updateValidators = (newValidations: StreamValidator[]) => {
    // @ts-ignore - Work around type assignment for complex validation data types
    setValidations(newValidations)
    setVList((value) => {
      const newValidatorsList: Record<string, StreamValidator> = { ...value }
      newValidations.forEach((validation: any) => {
        newValidatorsList[validation.pubkey] = {
          ...value[validation.pubkey],
          signing_key: validation.pubkey,
          ledger_index: validation.ledger_index,
          ledger_hash: validation.ledger_hash,
        }
      })
      return mergeLatest(newValidatorsList, value)
    })
  }

  const validatorCount = Object.keys(vList).length
  const validators = Object.values(vList)

  const averageAgreement = useMemo(() => {
    const unlValidators = validators.filter((v: any) => Boolean(v.unl))
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
  }, [validators])

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
      <ValidatorsTable validators={validators} metrics={metrics} tab="uptime" />
    ),
    voting: (
      <>
        {votingNetworkSettings}
        <ValidatorsTable
          validators={validators}
          metrics={metrics}
          tab="voting"
          feeSettings={feeSettings}
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

      {network && (
        <Streams
          validators={vList}
          updateValidators={updateValidators}
          updateMetrics={setMetrics}
        />
      )}

      <div className="network-stats">
        <MetricCard label="Validators" value={validatorCount || undefined} />
        <MetricCard label="UNL Count" value={unlCount || undefined} />
        <MetricCard label="UNL 30D Agreement" value={averageAgreement} />
      </div>

      {
        // @ts-ignore - Work around for complex type assignment issues
        <TooltipProvider>
          <Hexagons data={validations} list={vList} />
        </TooltipProvider>
      }

      <div className="wrap">
        <ValidatorsTabs selected={tab} />
        {Body}
      </div>
    </div>
  )
}
