import { useContext, useEffect, useMemo } from 'react'
import { useQuery } from 'react-query'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'
import { deriveAddress } from 'xrpl'
import { decodeNodePublic } from 'ripple-address-codec'
import { bytesToHex } from '@xrplf/isomorphic/utils'
import { Loader } from '../shared/components/Loader'
import { RouteLink } from '../shared/routing'
import { ACCOUNT_ROUTE, VALIDATOR_ROUTE } from '../App/routes'
import SocketContext from '../shared/SocketContext'
import NetworkContext from '../shared/NetworkContext'
import { FETCH_INTERVAL_VHS_MILLIS } from '../shared/utils'
import './exclusions.scss'

interface ExclusionData {
  exclusion_count: number
  exclusion_list: string[]
}

interface ExclusionInfo {
  consensus_percentage: number
  consensus_threshold: number
  excluded_accounts: Record<
    string,
    {
      exclusion_count: number
      meets_threshold: boolean
      percentage: number
      reason?: string
      date_added?: string
    }
  >
  exclusion_manager_stats: {
    consensus_excluded_count: number
    total_validators_cached: number
    unique_exclusions: number
  }
  status: string
  total_validators: number
  validators: Record<string, ExclusionData>
}

// Convert validator public key (nXXX...) to account address (rXXX...)
function validatorPublicKeyToAddress(
  validatorPublicKey: string,
): string | null {
  try {
    if (!validatorPublicKey.startsWith('n')) {
      return validatorPublicKey
    }
    const publicKeyBytes = decodeNodePublic(validatorPublicKey)
    const publicKeyHex = bytesToHex(publicKeyBytes)
    const address = deriveAddress(publicKeyHex)
    return address
  } catch (error) {
    return null
  }
}

export const Exclusions = () => {
  const rippledSocket = useContext(SocketContext)
  const network = useContext(NetworkContext)

  const { data: exclusionData, isFetching: isLoading } =
    useQuery<ExclusionInfo | null>(
      ['fetchExclusionData'],
      async () => fetchExclusionData(),
      {
        refetchInterval: FETCH_INTERVAL_VHS_MILLIS,
        refetchOnMount: true,
        enabled: !!network && !!rippledSocket,
      },
    )

  // Fetch validators list to get public keys
  const { data: validatorsData } = useQuery(
    ['fetchValidators', network],
    async () => {
      if (!network) return null
      const url = `${process.env.VITE_DATA_URL}/validators/${network}`
      return axios.get(url).then((resp) => resp.data)
    },
    {
      refetchInterval: FETCH_INTERVAL_VHS_MILLIS,
      enabled: !!network,
    },
  )

  // Create mapping from address to validator public key
  const addressToValidatorKey = useMemo(() => {
    const mapping: Record<string, string> = {}
    if (validatorsData?.validators) {
      validatorsData.validators.forEach((validator: any) => {
        // Try to derive address from validator's public key
        const validatorKey = validator.validation_public_key || validator.signing_key || validator.master_key
        if (validatorKey) {
          const address = validatorPublicKeyToAddress(validatorKey)
          if (address) {
            mapping[address] = validatorKey
          }
        }
      })
    }
    return mapping
  }, [validatorsData])

  function fetchExclusionData() {
    return rippledSocket
      .send({
        command: 'exclusion_info',
      })
      .then((resp: any) => {
        if (resp.error) {
          // Error fetching exclusion data
          return null
        }
        return resp
      })
      .catch(() => {
        // Error fetching exclusion data
        return null
      })
  }

  if (isLoading) {
    return (
      <div className="exclusions-page">
        <Helmet title="Exclusions" />
        <Loader />
      </div>
    )
  }

  if (!exclusionData) {
    return (
      <div className="exclusions-page">
        <Helmet title="Exclusions" />
        <div className="no-data">No exclusion data available</div>
      </div>
    )
  }

  // Sort excluded accounts by exclusion count (descending)
  const sortedExcludedAccounts = Object.entries(
    exclusionData.excluded_accounts || {},
  ).sort(([, a], [, b]) => b.exclusion_count - a.exclusion_count)

  // Sort validators by exclusion count (descending)
  const sortedValidators = Object.entries(exclusionData.validators || {}).sort(
    ([, a], [, b]) => b.exclusion_count - a.exclusion_count,
  )

  return (
    <div className="exclusions-page">
      <Helmet title="Network Exclusions" />

      <div className="page-header">
        <h1>Network Exclusions</h1>
      </div>

      <div className="summary-section">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-label">Total Validators</div>
            <div className="summary-value">
              {exclusionData.total_validators}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Consensus Threshold</div>
            <div className="summary-value">
              {exclusionData.consensus_threshold}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Consensus Percentage</div>
            <div className="summary-value">
              {exclusionData.consensus_percentage}%
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Unique Exclusions</div>
            <div className="summary-value">
              {exclusionData.exclusion_manager_stats?.unique_exclusions || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="content-grid">
        <div className="excluded-accounts-section">
          <h2>Excluded Accounts</h2>
          <div className="table-wrapper">
            <table className="exclusions-table">
              <thead>
                <tr>
                  <th>Account Address</th>
                  <th>Reason</th>
                  <th>Date Added</th>
                  <th>Exclusion Count</th>
                  <th>Percentage</th>
                  <th>Meets Threshold</th>
                </tr>
              </thead>
              <tbody>
                {sortedExcludedAccounts.length > 0 ? (
                  sortedExcludedAccounts.map(([address, data]) => (
                    <tr key={address}>
                      <td>
                        <RouteLink to={ACCOUNT_ROUTE} params={{ id: address }}>
                          {address}
                        </RouteLink>
                      </td>
                      <td>{data.reason || '-'}</td>
                      <td>
                        {data.date_added
                          ? new Date(data.date_added).toLocaleDateString()
                          : '-'}
                      </td>
                      <td>{data.exclusion_count}</td>
                      <td>{data.percentage}%</td>
                      <td>
                        <span
                          className={
                            data.meets_threshold
                              ? 'meets-threshold'
                              : 'below-threshold'
                          }
                        >
                          {data.meets_threshold ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="no-data">
                      No excluded accounts
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="validators-section">
          <h2>Validators and Their Exclusions</h2>
          <div className="table-wrapper">
            <table className="validators-table">
              <thead>
                <tr>
                  <th>Validator</th>
                  <th>Exclusion Count</th>
                  <th>Excluded Accounts</th>
                </tr>
              </thead>
              <tbody>
                {sortedValidators.map(([validatorAddress, data]) => {
                  const validatorPublicKey = addressToValidatorKey[validatorAddress]
                  const displayId = validatorPublicKey || validatorAddress
                  const isValidator = !!validatorPublicKey

                  return (
                    <tr key={validatorAddress}>
                      <td>
                        {isValidator ? (
                          <RouteLink
                            to={VALIDATOR_ROUTE}
                            params={{ identifier: displayId }}
                          >
                            {displayId}
                          </RouteLink>
                        ) : (
                          <RouteLink
                            to={ACCOUNT_ROUTE}
                            params={{ id: displayId }}
                          >
                            {displayId}
                          </RouteLink>
                        )}
                      </td>
                      <td>{data.exclusion_count}</td>
                      <td>
                        <div className="excluded-list">
                          {data.exclusion_list && data.exclusion_list.length > 0
                            ? data.exclusion_list.map((excluded, idx) => (
                                <span key={excluded}>
                                  <RouteLink
                                    to={ACCOUNT_ROUTE}
                                    params={{ id: excluded }}
                                  >
                                    {excluded.substring(0, 8)}...
                                  </RouteLink>
                                  {idx < data.exclusion_list.length - 1 && ', '}
                                </span>
                              ))
                            : 'None'}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
