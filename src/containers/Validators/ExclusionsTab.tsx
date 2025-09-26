import { FC } from 'react'
import { RouteLink } from '../shared/routing'
import { Loader } from '../shared/components/Loader'
import '../shared/css/simpleTab.scss'
import './exclusionsTab.scss'
import { ACCOUNT_ROUTE } from '../App/routes'

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

interface ExclusionsTabProps {
  validatorId: string
  exclusionData: ExclusionInfo | null
  isLoading: boolean
}

export const ExclusionsTab: FC<ExclusionsTabProps> = ({
  validatorId,
  exclusionData,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="exclusions-tab">
        <Loader />
      </div>
    )
  }

  if (!exclusionData || !exclusionData.validators) {
    return (
      <div className="exclusions-tab">
        <div className="no-data">No exclusion data available</div>
      </div>
    )
  }

  const validatorData = exclusionData.validators[validatorId]

  if (!validatorData) {
    return (
      <div className="exclusions-tab">
        <div className="no-data">
          No exclusion data found for this validator
        </div>
      </div>
    )
  }

  // eslint-disable-next-line camelcase
  const { exclusion_list } = validatorData

  return (
    <div className="exclusions-tab">
      <div className="exclusions-list">
        <h3>Excluded Accounts by This Validator</h3>
        {/* eslint-disable-next-line camelcase */}
        {exclusion_list && exclusion_list.length > 0 ? (
          <div className="table-wrapper">
            <table className="exclusions-table">
              <thead>
                <tr>
                  <th>Account Address</th>
                  <th>Exclusion Count</th>
                  <th>Percentage</th>
                  <th>Meets Threshold</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line camelcase */}
                {exclusion_list.map((address) => {
                  const accountData = exclusionData.excluded_accounts[address]
                  return (
                    <tr key={address}>
                      <td>
                        <RouteLink to={ACCOUNT_ROUTE} params={{ id: address }}>
                          {address}
                        </RouteLink>
                      </td>
                      <td>{accountData?.exclusion_count || 0}</td>
                      <td>{accountData?.percentage || 0}%</td>
                      <td>
                        <span
                          className={
                            accountData?.meets_threshold
                              ? 'meets-threshold'
                              : 'below-threshold'
                          }
                        >
                          {accountData?.meets_threshold ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-exclusions">
            This validator has no excluded accounts
          </div>
        )}
      </div>
    </div>
  )
}
