import DomainLink from '../../shared/components/DomainLink'

interface Props {
  domain?: string
  taxon: number
  serial: number
  transferFee: string
}

export const Details = ({ domain, taxon, serial, transferFee }: Props) => (
  <div className="nft-details-list">
    {domain && (
      <div className="nft-detail-row">
        <span className="nft-detail-label">Domain</span>
        <span className="nft-detail-value">
          <DomainLink domain={domain} />
        </span>
      </div>
    )}
    <div className="nft-detail-row">
      <span className="nft-detail-label">Taxon ID</span>
      <span className="nft-detail-value">{taxon}</span>
    </div>
    <div className="nft-detail-row">
      <span className="nft-detail-label">Serial</span>
      <span className="nft-detail-value">{serial}</span>
    </div>
    <div className="nft-detail-row">
      <span className="nft-detail-label">Transfer Fee</span>
      <span className="nft-detail-value">{transferFee}</span>
    </div>
  </div>
)
