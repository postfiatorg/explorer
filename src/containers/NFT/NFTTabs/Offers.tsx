import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery } from 'react-query'
import { Loader } from '../../shared/components/Loader'
import './styles.scss'
import { useAnalytics } from '../../shared/analytics'
import SocketContext from '../../shared/SocketContext'
import { Amount } from '../../shared/components/Amount'
import { formatAmount } from '../../../rippled/lib/txSummary/formatAmount'
import { LoadMoreButton } from '../../shared/LoadMoreButton'
import { ACCOUNT_ROUTE } from '../../App/routes'
import { RouteLink } from '../../shared/routing'

interface Props {
  tokenId: string
  offerType: string
  fetchOffers: (
    socket: any,
    id: string,
    limit: number | undefined,
    marker: any,
  ) => Promise<any>
}

export const Offers = (props: Props) => {
  const { t } = useTranslation()
  const { tokenId, fetchOffers, offerType } = props
  const { trackException } = useAnalytics()
  const rippledSocket = useContext(SocketContext)

  const {
    data,
    isFetching: loading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery(
    [offerType, tokenId],
    ({ pageParam = '' }) =>
      fetchOffers(rippledSocket, tokenId, undefined, pageParam),
    {
      getNextPageParam: (lastPage) => lastPage.marker,
      onError: (_e: any) => {
        trackException(`Cannot find ${offerType} for NFT ${tokenId}`)
      },
    },
  )

  const allOffers = data?.pages?.flatMap((page: any) => page.offers) ?? []

  if (loading && allOffers.length === 0) return <Loader />

  if (allOffers.length === 0) {
    return (
      <div className="nft-offers-empty">
        {offerType === 'BuyOffers' ? t('no_buy_offers') : t('no_sell_offers')}
      </div>
    )
  }

  return (
    <div className="nft-offers-grid">
      {allOffers.map((d: any) => {
        const { amount, owner, nft_offer_index: offerIndex } = d
        return (
          <div key={offerIndex} className="nft-offer-card">
            <div className="nft-offer-id" title={offerIndex}>
              {offerIndex}
            </div>
            <div className="nft-offer-row">
              <span className="nft-offer-label">{t('owner')}</span>
              <RouteLink
                to={ACCOUNT_ROUTE}
                params={{ id: owner }}
                className="nft-offer-owner"
              >
                {owner}
              </RouteLink>
            </div>
            <div className="nft-offer-row">
              <span className="nft-offer-label">{t('amount')}</span>
              <span className="nft-offer-amount">
                <Amount value={formatAmount(amount)} />
              </span>
            </div>
          </div>
        )
      })}
      {loading && <Loader />}
      {hasNextPage && !loading && (
        <LoadMoreButton onClick={() => fetchNextPage()} />
      )}
    </div>
  )
}
