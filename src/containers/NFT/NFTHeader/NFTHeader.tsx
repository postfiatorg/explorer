import { useEffect, useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { CopyableAddress } from '../../shared/components/CopyableAddress/CopyableAddress'
import './styles.scss'
import SocketContext from '../../shared/SocketContext'
import { getAccountInfo } from '../../../rippled/lib/rippled'
import { formatAccountInfo } from '../../../rippled/lib/utils'
import { BAD_REQUEST, HASH256_REGEX, localizeNumber } from '../../shared/utils'
import { Details } from './Details'
import { Settings } from './Settings'
import { Account } from '../../shared/components/Account'
import { useLanguage } from '../../shared/hooks'
import { parseIssuerFromNFTokenID } from '../../../rippled/NFTTransactions'
import { AccountFormattedInfo } from '../../shared/Interfaces'

const NFT_FLAG_BURNABLE = 0x0001
const NFT_FLAG_ONLY_XRP = 0x0002
const NFT_FLAG_TRANSFERABLE = 0x0008

const TAXON_SCRAMBLE_A = 384160001
const TAXON_SCRAMBLE_B = 2459

function parseNFTokenID(tokenId: string) {
  const flagsInt = parseInt(tokenId.substring(0, 4), 16)
  const transferFeeRaw = parseInt(tokenId.substring(4, 8), 16)
  const issuer = parseIssuerFromNFTokenID(tokenId)
  const scrambledTaxon = parseInt(tokenId.substring(48, 56), 16) >>> 0
  const sequence = parseInt(tokenId.substring(56, 64), 16) >>> 0
  const unscramble =
    ((TAXON_SCRAMBLE_A * sequence + TAXON_SCRAMBLE_B) & 0xffffffff) >>> 0
  const taxon = (scrambledTaxon ^ unscramble) >>> 0

  const flags: string[] = []
  if (flagsInt & NFT_FLAG_BURNABLE) flags.push('lsfBurnable')
  if (flagsInt & NFT_FLAG_ONLY_XRP) flags.push('lsfOnlyXRP')
  if (flagsInt & NFT_FLAG_TRANSFERABLE) flags.push('lsfTransferable')

  return {
    flags,
    transferFee: transferFeeRaw,
    issuer,
    taxon,
    serial: sequence,
  }
}

interface Props {
  tokenId: string
  setError: (error: number | null) => void
}

export const NFTHeader = ({ tokenId, setError }: Props) => {
  const { t } = useTranslation()
  const language = useLanguage()
  const rippledSocket = useContext(SocketContext)

  useEffect(() => {
    if (!HASH256_REGEX.test(tokenId)) {
      setError(BAD_REQUEST)
    }
  }, [setError, tokenId])

  const parsed = useMemo(() => parseNFTokenID(tokenId), [tokenId])

  const { data: accountData } = useQuery<AccountFormattedInfo>(
    ['getAccountInfo', parsed.issuer],
    async () => {
      const info = await getAccountInfo(rippledSocket, parsed.issuer)
      return formatAccountInfo(info, {})
    },
    { enabled: !!parsed.issuer },
  )

  const feeDisplay = parsed.transferFee
    ? `${localizeNumber((parsed.transferFee / 1000).toPrecision(5), language, { minimumFractionDigits: 3 })}%`
    : '0%'

  return (
    <>
      <div className="nft-hero detail-summary dashboard-panel">
        <div className="detail-summary-label">NFT</div>
        <div className="nft-hero-id">
          <CopyableAddress address={tokenId} truncate />
        </div>
        {parsed.issuer && (
          <div className="detail-summary-hash-row">
            <span className="detail-summary-hash-label">Issuer:</span>
            <Account account={parsed.issuer} />
          </div>
        )}
      </div>

      <div className="nft-details-columns">
        <div className="nft-details-panel dashboard-panel">
          <h3 className="dashboard-panel-title">{t('details')}</h3>
          <Details
            domain={accountData?.domain}
            taxon={parsed.taxon}
            serial={parsed.serial}
            transferFee={feeDisplay}
          />
        </div>
        <div className="nft-settings-panel dashboard-panel">
          <h3 className="dashboard-panel-title">{t('settings')}</h3>
          <Settings flags={parsed.flags} />
        </div>
      </div>
    </>
  )
}
