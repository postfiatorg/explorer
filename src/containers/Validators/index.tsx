import { useContext, useEffect } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { useWindowSize } from 'usehooks-ts'
import { deriveAddress } from 'xrpl'
import { decodeNodePublic } from 'ripple-address-codec'
import { bytesToHex } from '@xrplf/isomorphic/utils'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import NoMatch from '../NoMatch'
import { Loader } from '../shared/components/Loader'
import { Tabs } from '../shared/components/Tabs'
import { useAnalytics } from '../shared/analytics'
import {
  FETCH_INTERVAL_ERROR_MILLIS,
  FETCH_INTERVAL_VHS_MILLIS,
  NOT_FOUND,
  SERVER_ERROR,
} from '../shared/utils'
import { getLedger } from '../../rippled'
import { SimpleTab } from './SimpleTab'
import { HistoryTab } from './HistoryTab'
import './validator.scss'
import SocketContext from '../shared/SocketContext'
import { ValidatorReport, ValidatorSupplemented } from '../shared/vhsTypes'
import NetworkContext from '../shared/NetworkContext'
import { VALIDATOR_ROUTE } from '../App/routes'
import { buildPath, useRouteParams } from '../shared/routing'
import { VotingTab } from './VotingTab'
import { ExclusionsTab } from './ExclusionsTab'
import logger from '../../rippled/lib/logger'

const log = logger({ name: 'validator' })

// Convert validator public key (nXXX...) to account address (rXXX...)
function validatorPublicKeyToAddress(
  validatorPublicKey: string,
): string | null {
  try {
    if (!validatorPublicKey.startsWith('n')) {
      // If it's already an address, return it
      return validatorPublicKey
    }

    // Decode the validator public key to get raw bytes
    const publicKeyBytes = decodeNodePublic(validatorPublicKey)

    // Convert bytes to hex string (deriveAddress expects hex string)
    const publicKeyHex = bytesToHex(publicKeyBytes)

    // Derive the address from the public key
    const address = deriveAddress(publicKeyHex)

    // Successfully converted validator key to address
    return address
  } catch (error) {
    // Error converting validator public key to address
    return null
  }
}

const ERROR_MESSAGES = {
  [NOT_FOUND]: {
    title: 'validator_not_found',
    hints: ['check_validator_key'],
  },
  default: {
    title: 'generic_error',
    hints: ['not_your_fault'],
  },
}

const getErrorMessage = (error: keyof typeof ERROR_MESSAGES | null) =>
  (error && ERROR_MESSAGES[error]) || ERROR_MESSAGES.default

export const Validator = () => {
  const rippledSocket = useContext(SocketContext)
  const network = useContext(NetworkContext)
  const { identifier = '', tab = 'details' } = useRouteParams(VALIDATOR_ROUTE)
  const { width } = useWindowSize()
  const { trackException, trackScreenLoaded } = useAnalytics()
  const { t } = useTranslation()

  const {
    data,
    error,
    isFetching: dataIsLoading,
  } = useQuery<ValidatorSupplemented, keyof typeof ERROR_MESSAGES | null>(
    ['fetchValidatorData', identifier],
    async () => fetchValidatorData(),
    {
      refetchInterval: (returnedData, _) =>
        returnedData == null
          ? FETCH_INTERVAL_ERROR_MILLIS
          : FETCH_INTERVAL_VHS_MILLIS,
      refetchOnMount: true,
      enabled: !!network,
    },
  )

  const { data: reports, isFetching: reportIsLoading } = useQuery(
    ['fetchValidatorReport', identifier],
    async () => fetchValidatorReport(),
    {
      refetchInterval: FETCH_INTERVAL_VHS_MILLIS,
      refetchOnMount: true,
    },
  )

  const { data: exclusionData, isFetching: exclusionIsLoading } = useQuery<any>(
    ['fetchExclusionData'],
    async () => fetchExclusionData(),
    {
      refetchInterval: FETCH_INTERVAL_VHS_MILLIS,
      refetchOnMount: true,
      enabled: !!network && !!rippledSocket,
    },
  )

  useEffect(() => {
    trackScreenLoaded({ validator: identifier })
  }, [identifier, tab, trackScreenLoaded])

  function fetchValidatorReport(): Promise<ValidatorReport[]> {
    return axios
      .get(`${process.env.VITE_DATA_URL}/validator/${identifier}/reports`)
      .then((resp) => resp.data.reports)
      .then((vhsReports: ValidatorReport[]) => {
        const sortedValidatorReports = vhsReports.sort((a, b) =>
          a.date > b.date ? -1 : 1,
        )
        return sortedValidatorReports
      })
  }

  function fetchExclusionData() {
    // Use WebSocket connection to fetch exclusion data
    return rippledSocket
      .send({
        command: 'exclusion_info',
      })
      .then((resp) => {
        if (resp.error) {
          log.error(
            `Error fetching exclusion data: ${resp.error_message || resp.error}`,
          )
          return null
        }
        return resp
      })
      .catch((exclusionError) => {
        log.error(`Error fetching exclusion data: ${exclusionError.message}`)
        return null
      })
  }

  function fetchValidatorData() {
    const url = `${process.env.VITE_DATA_URL}/validator/${identifier}`
    return axios
      .get(url)
      .then((resp) => resp.data)
      .then((response) => {
        if (response.ledger_hash == null) {
          return getLedger(response.current_index, rippledSocket)
            .then((ledgerData) => ({
              ...response,
              ledger_hash: ledgerData.ledger_hash,
              last_ledger_time: ledgerData.close_time,
            }))
            .catch((ledgerError) => {
              // Log the error and return response without ledger data
              log.error(`Error fetching ledger data: ${ledgerError.message}`)
              return response
            })
        }
        return response
      })
      .catch((axiosError) => {
        const status =
          axiosError.response && axiosError.response.status
            ? axiosError.response.status
            : SERVER_ERROR
        trackException(`${url} --- ${JSON.stringify(axiosError)}`)
        return Promise.reject(status)
      })
  }

  function renderPageTitle() {
    if (!data) {
      return undefined
    }

    let short = ''
    if (data.domain) {
      short = data.domain
    } else if (data.master_key) {
      short = `${data.master_key.substring(0, 8)}...`
    } else if (data.signing_key) {
      short = `${data.signing_key.substring(0, 8)}...`
    }

    return (
      <SEOHelmet
        title={`${t('validator')} ${short}`}
        description={t('meta.validator.description', { id: short })}
        path={`/validators/${identifier}`}
        breadcrumbs={[
          { name: t('validators'), path: '/network/validators' },
          {
            name: `${t('validator')} ${short}`,
            path: `/validators/${identifier}`,
          },
        ]}
      />
    )
  }

  function renderSummary() {
    let name = 'Unknown Validator'
    if (data?.domain) {
      name = `Validator / Domain: ${data.domain}`
    } else if (data?.master_key) {
      name = `Validator / Public Key: ${data.master_key.substring(0, 8)}...`
    } else if (data?.signing_key) {
      name = `Validator / Ephemeral Key: ${data.signing_key.substring(0, 8)}...`
    }

    let subtitle = 'UNKNOWN KEY'
    if (data?.master_key) {
      subtitle = `MASTER KEY: ${data.master_key}`
    } else if (data?.signing_key) {
      subtitle = `SIGNING KEY: ${data.signing_key}`
    }

    return (
      <div className="summary">
        <div className="type">{name}</div>
        <div className="hash" title={subtitle}>
          {subtitle}
        </div>
      </div>
    )
  }

  function renderTabs() {
    const tabs = ['details', 'history', 'voting', 'exclusions']
    const mainPath = buildPath(VALIDATOR_ROUTE, { identifier })
    return <Tabs tabs={tabs} selected={tab} path={mainPath} />
  }

  function renderValidator() {
    let body

    switch (tab) {
      case 'history':
        body = <HistoryTab reports={reports ?? []} />
        break
      case 'voting':
        body = data && <VotingTab validatorData={data} network={network} />
        break
      case 'exclusions': {
        // Convert validator public key to address for matching with exclusion data
        const validatorAddress = validatorPublicKeyToAddress(identifier)
        body = (
          <ExclusionsTab
            validatorId={validatorAddress || identifier}
            exclusionData={exclusionData}
            isLoading={exclusionIsLoading}
          />
        )
        break
      }
      default:
        body = data && <SimpleTab data={data} width={width} />
        break
    }

    return (
      <>
        {renderPageTitle()}
        {renderSummary()}
        {renderTabs()}
        <div className="tab-body">{body}</div>
      </>
    )
  }

  const isLoading =
    dataIsLoading ||
    reportIsLoading ||
    (tab === 'exclusions' && exclusionIsLoading)
  let body

  if (error) {
    const message = getErrorMessage(error)
    body = <NoMatch title={message.title} hints={message.hints} />
  } else if (data?.master_key || data?.signing_key) {
    body = renderValidator()
  } else if (!isLoading) {
    body = (
      <div style={{ textAlign: 'center', fontSize: '14px' }}>
        <h2>Could not load validator</h2>
      </div>
    )
  }

  return (
    <div className="validator">
      {renderPageTitle()}
      {isLoading && <Loader />}
      {body}
    </div>
  )
}
