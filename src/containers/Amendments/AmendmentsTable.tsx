import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AMENDMENT_ROUTE, TRANSACTION_ROUTE } from '../App/routes'
import { Loader } from '../shared/components/Loader'
import { useLanguage } from '../shared/hooks'
import { RouteLink } from '../shared/routing'
import { localizeDate } from '../shared/utils'
import { AmendmentData, Voter } from '../shared/vhsTypes'

const DATE_OPTIONS_AMENDMENTS = {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
}

interface AmendmentsTableProps {
  amendments: AmendmentData[] | undefined
  mode: 'enabled' | 'voting'
}

export const AmendmentsTable: FC<AmendmentsTableProps> = ({
  amendments,
  mode,
}) => {
  const { t } = useTranslation()
  const language = useLanguage()

  const renderName = (name: string, id: string, deprecated: boolean) =>
    deprecated ? (
      <div className="name-deprecated">
        <span className="name-text text-truncate">
          <RouteLink to={AMENDMENT_ROUTE} params={{ identifier: id }}>
            {name}
          </RouteLink>
        </span>
        <span className="deprecated badge">{t('deprecated')}</span>
      </div>
    ) : (
      <span className="name-text">
        <RouteLink to={AMENDMENT_ROUTE} params={{ identifier: id }}>
          {name}
        </RouteLink>
      </span>
    )

  const renderVersion = (version: string | undefined) =>
    version ? (
      <Link
        to={`https://github.com/postfiatorg/pftld/releases/tag/${version}`}
        target="_blank"
      >
        {version}
      </Link>
    ) : null

  const renderEnabledRow = (amendment: AmendmentData, index: number) => {
    const dateLocalized = amendment.date
      ? localizeDate(
          new Date(amendment.date),
          language,
          DATE_OPTIONS_AMENDMENTS,
        )
      : null

    let enabledDate = null
    if (dateLocalized && amendment.tx_hash) {
      enabledDate = (
        <RouteLink
          to={TRANSACTION_ROUTE}
          params={{ identifier: amendment.tx_hash }}
        >
          {dateLocalized}
        </RouteLink>
      )
    } else if (dateLocalized) {
      enabledDate = <span>{dateLocalized}</span>
    }

    return (
      <tr key={amendment.id}>
        <td className="count">{index + 1}</td>
        <td className="name text-truncate">
          {renderName(amendment.name, amendment.id, amendment.deprecated)}
        </td>
        <td className="version">{renderVersion(amendment.rippled_version)}</td>
        <td className="enabled-date">{enabledDate}</td>
      </tr>
    )
  }

  const getVoterCount = (voted: Voter | undefined) => {
    if (!voted) return 0
    return voted.validators.filter((val) => val.unl !== false).length
  }

  const getConsensusColor = (consensus: string | undefined): string => {
    if (!consensus) return 'orange'
    const pct = parseFloat(consensus)
    if (pct >= 80) return 'green'
    if (pct >= 50) return 'yellow'
    return 'orange'
  }

  const renderVotingStatus = (amendment: AmendmentData) => {
    if (amendment.eta) {
      const etaLocalized = localizeDate(
        new Date(amendment.eta),
        language,
        DATE_OPTIONS_AMENDMENTS,
      )
      return (
        <div className="eta">
          <span className="eta-label">{t('eta')}</span> {etaLocalized}
        </div>
      )
    }
    return <span className="voting">{t('voting')}</span>
  }

  const renderConsensusBar = (consensus: string | undefined) => {
    if (!consensus) return null
    const pct = parseFloat(consensus)
    const color = getConsensusColor(consensus)
    return (
      <div className="consensus-cell">
        <span className={`consensus-value ${color}`}>{consensus}</span>
        <div className="consensus-bar-track">
          <div
            className={`consensus-bar-fill ${color}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    )
  }

  const renderVotingRow = (amendment: AmendmentData) => (
    <tr
      className={`amendment-row${amendment.eta ? ' incoming' : ''}`}
      key={amendment.id}
    >
      <td className="name text-truncate">
        {renderName(amendment.name, amendment.id, amendment.deprecated)}
      </td>
      <td className="version">{renderVersion(amendment.rippled_version)}</td>
      <td className="voters">{getVoterCount(amendment.voted)}</td>
      <td className="threshold">{amendment.threshold}</td>
      <td className="consensus">{renderConsensusBar(amendment.consensus)}</td>
      <td className="status">{renderVotingStatus(amendment)}</td>
    </tr>
  )

  if (!amendments)
    return (
      <div className="amendments-table">
        <Loader />
      </div>
    )

  if (mode === 'voting' && amendments.length === 0) {
    return (
      <div className="amendments-table">
        <div className="amendments-empty-state">
          All amendments are currently enabled. No active votes.
        </div>
      </div>
    )
  }

  const enabledTable = (
    <table className="basic">
      <thead>
        <tr>
          <th className="count">#</th>
          <th className="name">{t('amendment_name')}</th>
          <th className="version">{t('Version')}</th>
          <th className="enabled-date">{t('on_tx')}</th>
        </tr>
      </thead>
      <tbody>{amendments.map(renderEnabledRow)}</tbody>
    </table>
  )

  const votingTable = (
    <table className="basic">
      <thead>
        <tr>
          <th className="name">{t('amendment_name')}</th>
          <th className="version">{t('Version')}</th>
          <th className="voters">{`${t('unl')} ${t('voters')}`}</th>
          <th className="threshold">{t('threshold')}</th>
          <th className="consensus">{t('consensus')}</th>
          <th className="status">{t('status')}</th>
        </tr>
      </thead>
      <tbody>{amendments.map(renderVotingRow)}</tbody>
    </table>
  )

  return (
    <div className={`amendments-table ${mode}-tab`}>
      {mode === 'enabled' ? enabledTable : votingTable}
    </div>
  )
}
