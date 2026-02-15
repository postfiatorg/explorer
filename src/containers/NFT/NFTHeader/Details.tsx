import { NFTFormattedInfo, AccountFormattedInfo } from '../../shared/Interfaces'
import { Account } from '../../shared/components/Account'
import DomainLink from '../../shared/components/DomainLink'

interface Props {
  data: NFTFormattedInfo & AccountFormattedInfo
}

export const Details = ({ data }: Props) => {
  const {
    domain,
    NFTTaxon: nftTaxon,
    uri,
    owner,
    isBurned,
    NFTSerial: nftSerial,
  } = data

  return (
    <div className="nft-details-list">
      {domain && (
        <div className="nft-detail-row">
          <span className="nft-detail-label">Domain</span>
          <span className="nft-detail-value"><DomainLink domain={domain} /></span>
        </div>
      )}
      <div className="nft-detail-row">
        <span className="nft-detail-label">Taxon ID</span>
        <span className="nft-detail-value">{nftTaxon}</span>
      </div>
      <div className="nft-detail-row">
        <span className="nft-detail-label">Serial</span>
        <span className="nft-detail-value">{nftSerial}</span>
      </div>
      {uri && (
        <div className="nft-detail-row">
          <span className="nft-detail-label">URI</span>
          <span className="nft-detail-value mono">{uri}</span>
        </div>
      )}
      {isBurned && (
        <div className="nft-detail-row">
          <span className="nft-detail-label">Burned</span>
          <span className="nft-detail-value">Yes</span>
        </div>
      )}
      {owner && (
        <div className="nft-detail-row">
          <span className="nft-detail-label">Owner</span>
          <span className="nft-detail-value"><Account account={owner} /></span>
        </div>
      )}
    </div>
  )
}
