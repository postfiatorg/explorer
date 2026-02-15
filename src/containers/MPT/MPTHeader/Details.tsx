import { MPTIssuanceFormattedInfo } from '../../shared/Interfaces'

interface Props {
  data: MPTIssuanceFormattedInfo
  metadata?: Record<string, any>
}

export const Details = ({ data, metadata }: Props) => {
  const { maxAmt, outstandingAmt, assetScale } = data

  return (
    <div className="mpt-details-list">
      {metadata?.symbol && (
        <div className="mpt-detail-row">
          <span className="mpt-detail-label">Symbol</span>
          <span className="mpt-detail-value">{metadata.symbol}</span>
        </div>
      )}
      {metadata?.description && (
        <div className="mpt-detail-row">
          <span className="mpt-detail-label">Description</span>
          <span className="mpt-detail-value" title={metadata.description}>
            {metadata.description}
          </span>
        </div>
      )}
      {metadata?.website && (
        <div className="mpt-detail-row">
          <span className="mpt-detail-label">Website</span>
          <span className="mpt-detail-value">
            <a
              href={metadata.website}
              target="_blank"
              rel="noopener noreferrer"
            >
              {metadata.website}
            </a>
          </span>
        </div>
      )}
      {maxAmt && (
        <div className="mpt-detail-row">
          <span className="mpt-detail-label">Max Amount</span>
          <span className="mpt-detail-value">{maxAmt}</span>
        </div>
      )}
      {outstandingAmt && (
        <div className="mpt-detail-row">
          <span className="mpt-detail-label">Issued Amount</span>
          <span className="mpt-detail-value">{outstandingAmt}</span>
        </div>
      )}
      {assetScale != null && (
        <div className="mpt-detail-row">
          <span className="mpt-detail-label">Decimals</span>
          <span className="mpt-detail-value">{assetScale}</span>
        </div>
      )}
    </div>
  )
}
