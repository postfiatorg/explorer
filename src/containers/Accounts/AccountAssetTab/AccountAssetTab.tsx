import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useRouteParams } from '../../shared/routing'
import { AccountIssuedTokenTable } from '../AccountIssuedTokenTable'
import { AccountNFTTable } from '../AccountNFTTable/AccountNFTTable'
import { AccountMPTTable } from '../AccountMPTTable/AccountMPTTable'
import { ACCOUNT_ROUTE } from '../../App/routes'

interface Props {
  account: any
}

let assetTypes = ['issued', 'nft']

export const AccountAssetTab = ({ account }: Props) => {
  const { id: accountId = '', assetType = assetTypes[0] } =
    useRouteParams(ACCOUNT_ROUTE)

  const supportsMPT = ['mpt_sandbox', 'devnet'].includes(
    process.env.VITE_ENVIRONMENT as string,
  )
  if (supportsMPT) assetTypes = ['issued', 'nft', 'mpt']

  const navigate = useNavigate()
  const { t } = useTranslation()

  if (account.deleted) return null

  return (
    <div className="account-assets-panel dashboard-panel">
      <div className="account-asset-type-tabs">
        {assetTypes.map((type) => (
          <button
            type="button"
            key={type}
            className={`account-asset-type-tab ${assetType === type ? 'active' : ''}`}
            onClick={() => navigate(`/accounts/${accountId}/assets/${type}`)}
          >
            {t(`assets.${type}_tab_title` as any)}
          </button>
        ))}
      </div>

      <div className="account-asset-body">
        {assetType === 'issued' && (
          <AccountIssuedTokenTable account={account} />
        )}
        {assetType === 'nft' && <AccountNFTTable accountId={accountId} />}
        {assetType === 'mpt' && <AccountMPTTable accountId={accountId} />}
      </div>
    </div>
  )
}
