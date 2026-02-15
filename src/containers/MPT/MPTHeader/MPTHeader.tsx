import { useEffect, useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { Tag, Percent } from 'lucide-react'
import { Loader } from '../../shared/components/Loader'
import { CopyableAddress } from '../../shared/components/CopyableAddress/CopyableAddress'
import { MetricCard } from '../../shared/components/MetricCard/MetricCard'
import './styles.scss'
import SocketContext from '../../shared/SocketContext'
import { BAD_REQUEST, HASH192_REGEX, isValidJsonString } from '../../shared/utils'
import { Account } from '../../shared/components/Account'
import { useAnalytics } from '../../shared/analytics'
import { useLanguage } from '../../shared/hooks'
import { localizeNumber } from '../../shared/utils'
import { getMPTIssuance } from '../../../rippled/lib/rippled'
import { formatMPTIssuanceInfo } from '../../../rippled/lib/utils'
import { MPTIssuanceFormattedInfo } from '../../shared/Interfaces'
import { CollapsibleJsonPanel } from '../../Transactions/CollapsibleJsonPanel'
import { Details } from './Details'
import { Settings } from './Settings'

interface Props {
  tokenId: string
  setError: (error: number | null) => void
}

export const MPTHeader = (props: Props) => {
  const { t } = useTranslation()
  const language = useLanguage()
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

  const parsedMetadata = useMemo(() => {
    if (!data?.metadata || !isValidJsonString(data.metadata)) return undefined
    return JSON.parse(data.metadata)
  }, [data?.metadata])

  const feeDisplay = data?.transferFee
    ? `${localizeNumber((data.transferFee / 1000).toPrecision(5), language, { minimumFractionDigits: 3 })}%`
    : '0%'

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

      <div className="mpt-stats">
        {parsedMetadata?.name && (
          <MetricCard label="Name" value={parsedMetadata.name} icon={Tag} />
        )}
        <MetricCard label="Transfer Fee" value={feeDisplay} icon={Percent} />
      </div>

      <div className="mpt-details-columns">
        <div className="mpt-details-panel dashboard-panel">
          <h3 className="dashboard-panel-title">{t('details')}</h3>
          <Details data={data} metadata={parsedMetadata} />
        </div>
        <div className="mpt-settings-panel dashboard-panel">
          <h3 className="dashboard-panel-title">{t('settings')}</h3>
          <Settings flags={data.flags!} />
        </div>
      </div>

      {data.metadata && isValidJsonString(data.metadata) && (
        <CollapsibleJsonPanel
          data={JSON.parse(data.metadata)}
          title="Metadata"
        />
      )}
    </>
  )
}
