import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { TRANSACTION_ROUTE } from '../App/routes'
import { SimpleRow } from '../shared/components/Transaction/SimpleRow'
import { RouteLink } from '../shared/routing'
import { AmendmentData } from '../shared/vhsTypes'

interface SimpleProps {
  data: AmendmentData
}

export const Simple = ({ data }: SimpleProps) => {
  const { t } = useTranslation()

  const voting = data.voted !== undefined

  const renderStatus = () =>
    voting ? (
      <div className="badge voting">{`${t('not')} ${t('enabled')}`}</div>
    ) : (
      <div className="badge enabled">{t('enabled')}</div>
    )

  const details = `https://xrpl.org/resources/known-amendments#${data.name.toLowerCase()}`

  return (
    <div className="rows">
      <SimpleRow label={t('name')}>{data.name}</SimpleRow>
      <SimpleRow label={t('amendment_id')}>{data.id}</SimpleRow>
      <SimpleRow label={t('introduced_in')}>
        {data.rippled_version ? (
          <Link
            to={`https://github.com/postfiatorg/pftld/releases/tag/${data.rippled_version}`}
            target="_blank"
          >
            {`v${data.rippled_version}`}
          </Link>
        ) : (
          t('n_a')
        )}
      </SimpleRow>
      {voting ? (
        <SimpleRow label={t('threshold')}>{data.threshold}</SimpleRow>
      ) : (
        data.tx_hash && (
          <SimpleRow label={t('enable_tx')}>
            <RouteLink
              to={TRANSACTION_ROUTE}
              params={{ identifier: data.tx_hash }}
            >
              {' '}
              {data.tx_hash}
            </RouteLink>
          </SimpleRow>
        )
      )}
      <SimpleRow label={t('details')}>
        <Link to={details} target="_blank">
          {details}
        </Link>
      </SimpleRow>
      <SimpleRow label={t('status')}>{renderStatus()}</SimpleRow>
    </div>
  )
}
