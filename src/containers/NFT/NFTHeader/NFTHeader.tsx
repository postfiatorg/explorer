import { useEffect, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { Loader } from '../../shared/components/Loader'
import { CopyableAddress } from '../../shared/components/CopyableAddress/CopyableAddress'
import './styles.scss'
import SocketContext from '../../shared/SocketContext'
import { getNFTInfo, getAccountInfo } from '../../../rippled/lib/rippled'
import { formatNFTInfo, formatAccountInfo } from '../../../rippled/lib/utils'
import { localizeDate, BAD_REQUEST, HASH256_REGEX } from '../../shared/utils'
import { Details } from './Details'
import { Settings } from './Settings'
import { Account } from '../../shared/components/Account'
import { getOldestNFTTransaction } from '../../../rippled/NFTTransactions'
import { useAnalytics } from '../../shared/analytics'
import { useLanguage } from '../../shared/hooks'
import { NFTFormattedInfo, AccountFormattedInfo } from '../../shared/Interfaces'

const TIME_ZONE = 'UTC'
const DATE_OPTIONS = {
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour12: true,
  timeZone: TIME_ZONE,
}

interface Props {
  tokenId: string
  setError: (error: number | null) => void
}

export const NFTHeader = (props: Props) => {
  const { t } = useTranslation()
  const language = useLanguage()
  const { tokenId, setError } = props
  const rippledSocket = useContext(SocketContext)
  const { trackException } = useAnalytics()

  const { data, isFetching: loading } = useQuery<NFTFormattedInfo>(
    ['getNFTInfo', tokenId],
    async () => {
      const info = await getNFTInfo(rippledSocket, tokenId)
      return formatNFTInfo(info)
    },
    {
      onError: (e: any) => {
        trackException(`NFT ${tokenId} --- ${JSON.stringify(e)}`)
        setError(e.code)
      },
    },
  )

  useEffect(() => {
    if (!HASH256_REGEX.test(tokenId)) {
      setError(BAD_REQUEST)
    }
  }, [setError, tokenId])

  const { data: firstTransaction } = useQuery(
    ['getFirstTransaction', tokenId],
    () => getOldestNFTTransaction(rippledSocket, tokenId),
    { enabled: !!data },
  )

  const { data: accountData } = useQuery<AccountFormattedInfo>(
    ['getAccountInfo'],
    async () => {
      const info = await getAccountInfo(rippledSocket, data?.issuer)
      return formatAccountInfo(info, {})
    },
    { enabled: !!data },
  )

  const mintedDate =
    firstTransaction?.transaction?.type === 'NFTokenMint'
      ? `${localizeDate(
          new Date(firstTransaction.transaction.date),
          language,
          DATE_OPTIONS,
        )} ${TIME_ZONE}`
      : undefined

  if (loading) return <Loader />

  if (!data) return null

  return (
    <>
      <div className="nft-hero detail-summary dashboard-panel">
        <div className="detail-summary-label">NFT</div>
        <div className="nft-hero-id">
          <CopyableAddress address={tokenId} truncate />
        </div>
        {data.issuer && (
          <div className="detail-summary-hash-row">
            <span className="detail-summary-hash-label">Issuer:</span>
            <Account account={data.issuer} />
          </div>
        )}
      </div>

      <div className="nft-details-columns">
        <div className="nft-details-panel dashboard-panel">
          <h3 className="dashboard-panel-title">{t('details')}</h3>
          <div className="nft-details-content">
            <Details
              data={{
                ...data,
                domain: accountData?.domain,
                minted: mintedDate,
              }}
            />
          </div>
        </div>
        <div className="nft-settings-panel dashboard-panel">
          <h3 className="dashboard-panel-title">{t('settings')}</h3>
          <div className="nft-details-content">
            <Settings flags={data.flags!} />
          </div>
        </div>
      </div>
    </>
  )
}
