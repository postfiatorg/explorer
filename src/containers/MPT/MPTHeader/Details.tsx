import { useLanguage } from '../../shared/hooks'
import { isValidJsonString, localizeNumber } from '../../shared/utils'
import { MPTIssuanceFormattedInfo } from '../../shared/Interfaces'
import { JsonView } from '../../shared/components/JsonView'

interface Props {
  data: MPTIssuanceFormattedInfo
}

export const Details = ({ data }: Props) => {
  const { transferFee, sequence, metadata } = data
  const language = useLanguage()
  const formattedFee =
    transferFee &&
    `${localizeNumber((transferFee / 1000).toPrecision(5), language, {
      minimumFractionDigits: 3,
    })}%`

  return (
    <div className="mpt-details-list">
      <div className="mpt-detail-row">
        <span className="mpt-detail-label">Transfer Fee</span>
        <span className="mpt-detail-value">{formattedFee ?? '0%'}</span>
      </div>
      <div className="mpt-detail-row">
        <span className="mpt-detail-label">Sequence</span>
        <span className="mpt-detail-value">{sequence}</span>
      </div>
      {metadata && (
        <div className="mpt-detail-row mpt-detail-row-metadata">
          <span className="mpt-detail-label">Metadata</span>
          <span className="mpt-detail-value">
            {isValidJsonString(metadata) ? (
              <JsonView data={JSON.parse(metadata)} />
            ) : (
              metadata
            )}
          </span>
        </div>
      )}
    </div>
  )
}
