import { useTranslation } from 'react-i18next'
import './NetworkPicker.scss'

export const NetworkPicker = () => {
  const { t } = useTranslation()
  const currentMode: string = process.env.VITE_ENVIRONMENT || 'mainnet'
  const networkName = t('network_name', { context: currentMode })

  return (
    <span className={`network-badge network-badge-${currentMode}`}>
      {networkName}
    </span>
  )
}
