import { useTranslation } from 'react-i18next'
import { SimpleRow } from '../../shared/components/Transaction/SimpleRow'
import { ValidatorSupplemented } from '../../shared/vhsTypes'
import { RouteLink } from '../../shared/routing'
import { LEDGER_ROUTE } from '../../App/routes'
import DomainLink from '../../shared/components/DomainLink'
import SuccessIcon from '../../shared/images/success.svg'

export interface SimpleProps {
  data: ValidatorSupplemented
}

const Simple = ({ data }: SimpleProps) => {
  const { t } = useTranslation()

  return (
    <>
      <SimpleRow label={t('domain')}>
        {data.domain ? <DomainLink domain={data.domain} /> : 'Unknown'}
      </SimpleRow>
      <SimpleRow label={t('domain_verified')} className="domain-verified">
        {data.domain_verified && (
          <SuccessIcon title="Domain verified" alt="Domain verified" />
        )}
      </SimpleRow>
      <SimpleRow label={t('rippled_version')} data-testid="version">
        {data.server_version}
      </SimpleRow>
      <div className="row">
        <div className="label">Master Key</div>
        <div className="value">{data.master_key || 'Unknown'}</div>
      </div>
      <div className="row">
        <div className="label">Signing Key</div>
        <div className="value">{data.signing_key || 'Unknown'}</div>
      </div>
      {data.current_index && (
        <SimpleRow label={t('ledger')}>
          <RouteLink
            to={LEDGER_ROUTE}
            params={{ identifier: data.current_index }}
          >
            {data?.ledger_hash || 'Unknown'}
          </RouteLink>
        </SimpleRow>
      )}
    </>
  )
}

export default Simple
