import { useEffect, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { Loader } from '../../shared/components/Loader'
import { CopyableAddress } from '../../shared/components/CopyableAddress/CopyableAddress'
import './styles.scss'
import SocketContext from '../../shared/SocketContext'
import { BAD_REQUEST, HASH192_REGEX } from '../../shared/utils'
import { Account } from '../../shared/components/Account'
import { useAnalytics } from '../../shared/analytics'
import { getMPTIssuance } from '../../../rippled/lib/rippled'
import { formatMPTIssuanceInfo } from '../../../rippled/lib/utils'
import { MPTIssuanceFormattedInfo } from '../../shared/Interfaces'
import { Details } from './Details'
import { Settings } from './Settings'

interface Props {
  tokenId: string
  setError: (error: number | null) => void
}

export const MPTHeader = (props: Props) => {
  const { t } = useTranslation()
  const { tokenId, setError } = props
  const rippledSocket = useContext(SocketContext)
  const { trackException } = useAnalytics()

  const { data, isFetching: loading } = useQuery<MPTIssuanceFormattedInfo>(
    ['getMPTIssuance', tokenId],
    async () => {
      const info = await getMPTIssuance(rippledSocket, tokenId)
      return formatMPTIssuanceInfo(info)
    },
    {
      onError: (e: any) => {
        trackException(`mptIssuance ${tokenId} --- ${JSON.stringify(e)}`)
        setError(e.code)
      },
    },
  )

  useEffect(() => {
    if (!HASH192_REGEX.test(tokenId)) {
      setError(BAD_REQUEST)
    }
  }, [setError, tokenId])

  if (loading) return <Loader />

  if (!data) return null

  return (
    <>
      <div className="mpt-hero detail-summary dashboard-panel">
        <div className="detail-summary-label">MPT Issuance</div>
        <div className="mpt-hero-id">
          <CopyableAddress address={tokenId} truncate />
        </div>
        {data.issuer && (
          <div className="detail-summary-hash-row">
            <span className="detail-summary-hash-label">Issuer:</span>
            <Account account={data.issuer} />
          </div>
        )}
      </div>

      <div className="detail-overview-grid">
        {data.maxAmt && (
          <div className="detail-overview-item">
            <span className="detail-overview-label">{t('max_amount')}</span>
            <span className="detail-overview-value">{data.maxAmt}</span>
          </div>
        )}
        {data.outstandingAmt && (
          <div className="detail-overview-item">
            <span className="detail-overview-label">{t('outstanding_amount')}</span>
            <span className="detail-overview-value">{data.outstandingAmt}</span>
          </div>
        )}
        {data.assetScale && (
          <div className="detail-overview-item">
            <span className="detail-overview-label">{t('asset_scale')}</span>
            <span className="detail-overview-value">{data.assetScale}</span>
          </div>
        )}
      </div>

      <div className="mpt-details-columns">
        <div className="mpt-details-panel dashboard-panel">
          <h3 className="dashboard-panel-title">{t('details')}</h3>
          <div className="mpt-details-content">
            <Details data={data} />
          </div>
        </div>
        <div className="mpt-settings-panel dashboard-panel">
          <h3 className="dashboard-panel-title">{t('settings')}</h3>
          <div className="mpt-details-content">
            <Settings flags={data.flags!} />
          </div>
        </div>
      </div>
    </>
  )
}
