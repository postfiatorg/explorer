import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery, useQuery } from 'react-query'
import { Loader } from '../../shared/components/Loader'
import SocketContext from '../../shared/SocketContext'
import { useAnalytics } from '../../shared/analytics'
import { getAccountMPTs, getMPTIssuance } from '../../../rippled/lib/rippled'
import { Account } from '../../shared/components/Account'
import { LoadMoreButton } from '../../shared/LoadMoreButton'
import { MPTokenLink } from '../../shared/components/MPTokenLink'
import {
  formatMPTokenInfo,
  formatMPTIssuanceInfo,
} from '../../../rippled/lib/utils'
import { MPTIssuanceFormattedInfo } from '../../shared/Interfaces'
import { convertScaledPrice } from '../../shared/utils'

export interface AccountMPTTableProps {
  accountId: string
}

export const AccountMPTRow = ({ mpt }: any) => {
  const rippledSocket = useContext(SocketContext)
  const { trackException } = useAnalytics()
  const { data: mptIssuanceData } = useQuery<MPTIssuanceFormattedInfo>(
    ['getMPTIssuanceScale', mpt.mptIssuanceID],
    async () => {
      const info = await getMPTIssuance(rippledSocket, mpt.mptIssuanceID)
      return formatMPTIssuanceInfo(info)
    },
    {
      onError: (e: any) => {
        trackException(
          `mptIssuance ${mpt.mptIssuanceID} --- ${JSON.stringify(e)}`,
        )
      },
    },
  )

  if (!mptIssuanceData) return null

  const scale = mptIssuanceData?.assetScale ?? 0

  return (
    <tr>
      <td>
        <MPTokenLink tokenID={mpt.mptIssuanceID} />
      </td>
      <td className="issuer-cell">
        <Account account={mpt.mptIssuer} />
      </td>
      <td className="right">
        {convertScaledPrice(
          parseInt(mpt.mptAmount as string, 10).toString(16),
          scale,
        )}
      </td>
    </tr>
  )
}

export const AccountMPTTable = ({ accountId }: AccountMPTTableProps) => {
  const rippledSocket = useContext(SocketContext)
  const { trackException } = useAnalytics()
  const {
    data: pages,
    isFetching: loading,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    ['account_objects', accountId],
    ({ pageParam = '' }) =>
      getAccountMPTs(rippledSocket, accountId, pageParam).catch(
        (errorResponse) => {
          const errorLocation = `account MPTs ${accountId} at ${pageParam}`
          trackException(
            `${errorLocation} --- ${JSON.stringify(errorResponse)}`,
          )
        },
      ),
    {
      getNextPageParam: (data) => data.marker,
    },
  )
  const { t } = useTranslation()

  const mpts = pages?.pages
    .flatMap((page: any) => page.account_objects)
    .map((mpt) => formatMPTokenInfo(mpt))

  if (loading) return <Loader />

  if (!mpts?.length) {
    return (
      <div className="account-asset-empty">{t('assets.no_mpts_message')}</div>
    )
  }

  return (
    <>
      <table className="account-asset-table">
        <thead>
          <tr>
            <th>Issuance ID</th>
            <th>Issuer</th>
            <th className="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {mpts.map((mpt) => (
            <AccountMPTRow key={mpt.mptIssuanceID} mpt={mpt} />
          ))}
        </tbody>
      </table>
      {hasNextPage && <LoadMoreButton onClick={() => fetchNextPage()} />}
    </>
  )
}
