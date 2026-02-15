import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery } from 'react-query'
import { Loader } from '../../shared/components/Loader'
import SocketContext from '../../shared/SocketContext'
import { useAnalytics } from '../../shared/analytics'
import { getAccountNFTs } from '../../../rippled/lib/rippled'
import { Account } from '../../shared/components/Account'
import { LoadMoreButton } from '../../shared/LoadMoreButton'
import { NFTokenLink } from '../../shared/components/NFTokenLink'

const TRANSFER_FEE_DIVISOR = 1000

function extractTransferFee(nftokenId: string): string {
  const feeHex = nftokenId.substring(8, 12)
  const feeRaw = parseInt(feeHex, 16)
  if (feeRaw === 0) return '0%'
  const pct = feeRaw / TRANSFER_FEE_DIVISOR
  return `${pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(2)}%`
}

export interface AccountNFTTableProps {
  accountId: string
}

export const AccountNFTTable = ({ accountId }: AccountNFTTableProps) => {
  const rippledSocket = useContext(SocketContext)
  const { trackException } = useAnalytics()
  const {
    data: pages,
    isFetching: loading,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery(
    ['account_nfts', accountId],
    ({ pageParam = '' }) =>
      getAccountNFTs(rippledSocket, accountId, pageParam).catch(
        (errorResponse) => {
          const errorLocation = `account NFTs ${accountId} at ${pageParam}`
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

  const nfts = pages?.pages.flatMap((page: any) => page.account_nfts)

  if (loading) return <Loader />

  if (!nfts?.length) {
    return <div className="account-asset-empty">{t('assets.no_nfts_message')}</div>
  }

  return (
    <>
      <table className="account-asset-table">
        <thead>
          <tr>
            <th>Token ID</th>
            <th>Issuer</th>
            <th className="right">Transfer Fee</th>
          </tr>
        </thead>
        <tbody>
          {nfts.map((nft: any) => (
            <tr key={nft.NFTokenID}>
              <td className="token-id-cell">
                <NFTokenLink tokenID={nft.NFTokenID} />
              </td>
              <td className="issuer-cell">
                <Account account={nft.Issuer} />
              </td>
              <td className="right">{extractTransferFee(nft.NFTokenID)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {hasNextPage && !loading && <LoadMoreButton onClick={() => fetchNextPage()} />}
    </>
  )
}
