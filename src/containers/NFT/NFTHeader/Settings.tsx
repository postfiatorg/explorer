import { useTranslation } from 'react-i18next'
import { StatusBadge } from '../../shared/components/StatusBadge/StatusBadge'

interface Props {
  flags: string[]
}

export const Settings = ({ flags }: Props) => {
  const { t } = useTranslation()

  const burnable = flags.includes('lsfBurnable')
  const onlyXRP = flags.includes('lsfOnlyXRP')
  const transferable = flags.includes('lsfTransferable')

  return (
    <div className="nft-settings-list">
      <div className="nft-setting-row">
        <span className="nft-setting-label">{t('burnable')}</span>
        <StatusBadge
          status={burnable ? 'enabled' : 'disabled'}
          label={burnable ? 'Enabled' : 'Disabled'}
        />
      </div>
      <div className="nft-setting-row">
        <span className="nft-setting-label">{t('only_xrp')}</span>
        <StatusBadge
          status={onlyXRP ? 'enabled' : 'disabled'}
          label={onlyXRP ? 'Enabled' : 'Disabled'}
        />
      </div>
      <div className="nft-setting-row">
        <span className="nft-setting-label">{t('transferable')}</span>
        <StatusBadge
          status={transferable ? 'enabled' : 'disabled'}
          label={transferable ? 'Enabled' : 'Disabled'}
        />
      </div>
    </div>
  )
}
