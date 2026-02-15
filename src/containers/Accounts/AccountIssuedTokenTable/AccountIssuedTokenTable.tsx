import { useTranslation } from 'react-i18next'
import Currency from '../../shared/components/Currency'
import { Loader } from '../../shared/components/Loader'
import { RouteLink } from '../../shared/routing'
import { TOKEN_ROUTE } from '../../App/routes'
import { localizeNumber } from '../../shared/utils'
import { useLanguage } from '../../shared/hooks'

interface Props {
  account: any
}

export const AccountIssuedTokenTable = (props: Props) => {
  const { account } = props
  const { t } = useTranslation()
  const language = useLanguage()

  function renderRow(token: any) {
    const tokenName = `${token.currency}.${token.issuer}`

    return (
      <tr key={tokenName}>
        <td className="currency-cell">
          <Currency currency={token.currency} />
        </td>
        <td className="issuer-cell">
          <RouteLink
            title={tokenName}
            to={TOKEN_ROUTE}
            params={{ token: `${token.currency}.${token.issuer}` }}
          >
            {token.issuer}
          </RouteLink>
        </td>
        <td className="right">
          {localizeNumber(token.amount, language, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 6,
          })}
        </td>
      </tr>
    )
  }

  if (!account.tokens) return <Loader />

  if (!account.tokens.length) {
    return (
      <div className="account-asset-empty">{t('assets.no_issued_message')}</div>
    )
  }

  return (
    <table className="account-asset-table">
      <thead>
        <tr>
          <th>Currency</th>
          <th>Issuer</th>
          <th className="right">Amount</th>
        </tr>
      </thead>
      <tbody>{account.tokens.map(renderRow)}</tbody>
    </table>
  )
}
