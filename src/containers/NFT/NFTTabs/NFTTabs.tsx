import './styles.scss'
import { Tabs } from '../../shared/components/Tabs'
import { getBuyNFToffers, getSellNFToffers } from '../../../rippled/lib/rippled'
import { Offers } from './Offers'
import { NFT_ROUTE } from '../../App/routes'
import { buildPath, useRouteParams } from '../../shared/routing'

interface Props {
  tokenId: string
}

export const NFTTabs = (props: Props) => {
  const { id = '', tab = 'buy-offers' } = useRouteParams(NFT_ROUTE)
  const { tokenId } = props

  const tabs = ['buy-offers', 'sell-offers']
  const mainPath = buildPath(NFT_ROUTE, { id })

  const renderContent = () => {
    switch (tab) {
      case 'sell-offers':
        return (
          <Offers
            key="SellOffers"
            tokenId={tokenId}
            fetchOffers={getSellNFToffers}
            offerType="SellOffers"
          />
        )
      default:
        return (
          <Offers
            key="BuyOffers"
            tokenId={tokenId}
            fetchOffers={getBuyNFToffers}
            offerType="BuyOffers"
          />
        )
    }
  }

  return (
    <div className="nft-tabs">
      <Tabs tabs={tabs} selected={tab} path={mainPath} />
      <div className="tab-body">{renderContent()}</div>
    </div>
  )
}
