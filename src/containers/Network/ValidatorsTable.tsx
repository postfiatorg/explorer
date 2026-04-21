import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck } from 'lucide-react'
import { FeeSettings, StreamValidator } from '../shared/vhsTypes'
import { RouteLink } from '../shared/routing'
import { VALIDATOR_ROUTE, LEDGER_ROUTE } from '../App/routes'
import SuccessIcon from '../shared/images/success.svg'
import UpIcon from '../shared/images/ic_up.svg'
import DownIcon from '../shared/images/ic_down.svg'
import DomainLink from '../shared/components/DomainLink'
import { Loader } from '../shared/components/Loader'
import './css/validatorsTable.scss'
import { useLanguage } from '../shared/hooks'
import { DROPS_TO_XRP_FACTOR, renderXRP } from '../shared/utils'
import {
  ScoringContext,
  ScoringInfo,
  STATUS_RANK,
  getScoringInfoForValidator,
  getStalenessLevel,
  formatRelativeTime,
} from './scoringUtils'

interface ValidatorsTableProps {
  validators: StreamValidator[]
  tab: string
  feeSettings?: FeeSettings
  scoringContext?: ScoringContext | null
}

const STATUS_BADGE_LABELS = {
  on_unl: 'on UNL',
  candidate: 'candidate',
  ineligible: 'ineligible',
  no_data: 'no data',
} as const

const STATUS_BADGE_GLYPHS = {
  on_unl: '●',
  candidate: '◐',
  ineligible: '○',
  no_data: '—',
} as const

const fallbackSort = (data: StreamValidator[]): StreamValidator[] =>
  [...data].sort((a, b) => {
    const aUnl = a.unl || 'zzz'
    const bUnl = b.unl || 'zzz'
    const aDomain = a.domain || 'zzz'
    const bDomain = b.domain || 'zzz'
    const aScore = a.agreement_30day ? a.agreement_30day.score : -1
    const bScore = b.agreement_30day ? b.agreement_30day.score : -1
    const aPubkey = a.master_key || a.signing_key
    const bPubkey = b.master_key || b.signing_key

    if (aUnl > bUnl) return 1
    if (aUnl < bUnl) return -1
    if (aScore < bScore) return 1
    if (aScore > bScore) return -1
    if (aDomain > bDomain) return 1
    if (aDomain < bDomain) return -1
    if (aPubkey > bPubkey) return 1
    if (aPubkey < bPubkey) return -1
    return 0
  })

const compareAgreement30dDesc = (
  a: StreamValidator,
  b: StreamValidator,
): number => {
  const aScore = a.agreement_30day ? Number(a.agreement_30day.score) : -1
  const bScore = b.agreement_30day ? Number(b.agreement_30day.score) : -1
  return bScore - aScore
}

const bestFirstSort = (
  data: StreamValidator[],
  infoByKey: Map<string, ScoringInfo>,
): StreamValidator[] =>
  [...data].sort((a, b) => {
    const keyA = a.master_key || a.signing_key
    const keyB = b.master_key || b.signing_key
    const infoA = infoByKey.get(keyA) ?? { status: 'no_data', score: null }
    const infoB = infoByKey.get(keyB) ?? { status: 'no_data', score: null }

    const rankDiff = STATUS_RANK[infoA.status] - STATUS_RANK[infoB.status]
    if (rankDiff !== 0) return rankDiff

    const scoreA = infoA.score ?? -1
    const scoreB = infoB.score ?? -1
    if (scoreA !== scoreB) return scoreB - scoreA

    return compareAgreement30dDesc(a, b)
  })

export const ValidatorsTable = (props: ValidatorsTableProps) => {
  const { validators: rawValidators, tab, feeSettings, scoringContext } = props
  const { t } = useTranslation()
  const language = useLanguage()

  const scoringEnabled = Boolean(scoringContext)

  const scoringInfoByKey = useMemo(() => {
    const map = new Map<string, ScoringInfo>()
    if (!rawValidators) return map
    rawValidators.forEach((v) => {
      const key = v.master_key || v.signing_key
      map.set(
        key,
        getScoringInfoForValidator(v.master_key, scoringContext ?? null),
      )
    })
    return map
  }, [rawValidators, scoringContext])

  const validators = useMemo(() => {
    if (!rawValidators) return undefined
    if (!scoringEnabled) return fallbackSort(rawValidators)
    return bestFirstSort(rawValidators, scoringInfoByKey)
  }, [rawValidators, scoringEnabled, scoringInfoByKey])

  const renderDomain = (domain, domainVerified) => (
    <>
      {domainVerified && (
        <CircleCheck
          className="domain-verified-badge"
          size={14}
          title="Domain verified"
        />
      )}
      {domain && <DomainLink domain={domain} />}
    </>
  )

  const getAgreementColor = (score: number): string => {
    if (score >= 0.99) return 'green'
    if (score >= 0.95) return 'yellow'
    return 'orange'
  }

  const renderAgreement = (className, agreement) =>
    agreement ? (
      <td
        className={`${className} score`}
        title={t('missed_validations', { count: agreement.missed })}
      >
        <div className="agreement-cell">
          <span
            className={`agreement-value ${getAgreementColor(Number(agreement.score))}`}
          >
            {(Number(agreement.score) * 100).toFixed(2)}%
            {agreement.incomplete && <span title={t('incomplete')}>*</span>}
          </span>
          <div className="agreement-bar-track">
            <div
              className={`agreement-bar-fill ${getAgreementColor(Number(agreement.score))}`}
              style={{ width: `${Number(agreement.score) * 100}%` }}
            />
          </div>
        </div>
      </td>
    ) : (
      <td className={`${className} score`} />
    )

  const renderFeeVoting = (className, data, currentFee, pubkey) =>
    data ? (
      <td className={`${className} vote`}>
        {currentFee &&
          data !== currentFee &&
          (data > currentFee ? (
            <span>
              <UpIcon className="fee-icon" title={pubkey} alt={pubkey} />
            </span>
          ) : (
            <span>
              <DownIcon className="fee-icon" title={pubkey} alt={pubkey} />
            </span>
          ))}
        <span>{renderXRP(data / DROPS_TO_XRP_FACTOR, language)}</span>
      </td>
    ) : (
      <td className={`${className} vote`} />
    )

  const renderStatusBadge = (info: ScoringInfo) => {
    const label = STATUS_BADGE_LABELS[info.status]
    const glyph = STATUS_BADGE_GLYPHS[info.status]
    const showScore = info.status !== 'no_data' && info.score != null
    const ariaLabel = showScore ? `Score ${info.score}, ${label}` : label
    return (
      <td
        className={`status-badge-cell status-${info.status.replace('_', '-')}`}
      >
        <span className="status-badge" aria-label={ariaLabel}>
          <span className="status-glyph" aria-hidden="true">
            {glyph}
          </span>
          {showScore && <span className="status-score">{info.score}</span>}
          <span className="status-label">{label}</span>
        </span>
      </td>
    )
  }

  const renderValidator = (d) => {
    const color = d.ledger_hash ? `#${d.ledger_hash.substring(0, 6)}` : ''
    const trusted = d.unl ? 'yes' : 'no'
    const pubkey = d.master_key || d.signing_key
    const ledgerIndex = d.ledger_index ?? d.current_index
    const scoringInfo = scoringInfoByKey.get(pubkey) ?? {
      status: 'no_data' as const,
      score: null,
    }

    return (
      <tr key={pubkey}>
        <td className="pubkey text-truncate" title={pubkey}>
          <RouteLink to={VALIDATOR_ROUTE} params={{ identifier: pubkey }}>
            {pubkey}
          </RouteLink>
        </td>
        <td className="domain text-truncate">
          {renderDomain(d.domain, d.domain_verified)}
        </td>
        {scoringEnabled ? (
          renderStatusBadge(scoringInfo)
        ) : (
          <td className={`unl ${trusted}`}>
            {d.unl && <SuccessIcon title={d.unl} alt={d.unl} />}
          </td>
        )}
        <td className="version text-truncate">{d.server_version}</td>
        {tab === 'uptime' ? (
          <>
            {renderAgreement('h1', d.agreement_1h)}
            {renderAgreement('h24', d.agreement_24h)}
            {renderAgreement('d30', d.agreement_30day)}
          </>
        ) : (
          <>
            {renderFeeVoting(
              'base',
              d.reserve_base,
              feeSettings?.reserve_base,
              pubkey,
            )}
            {renderFeeVoting(
              'owner',
              d.reserve_inc,
              feeSettings?.reserve_inc,
              pubkey,
            )}
            {renderFeeVoting(
              'base_fee',
              d.base_fee,
              feeSettings?.base_fee,
              pubkey,
            )}
          </>
        )}

        <td
          className="last-ledger"
          style={{ color }}
          title={d.partial ? 'partial validation' : undefined}
        >
          <RouteLink to={LEDGER_ROUTE} params={{ identifier: ledgerIndex }}>
            {ledgerIndex}
          </RouteLink>
          {d.partial && '*'}
        </td>
      </tr>
    )
  }

  const renderFreshnessFooter = () => {
    if (!scoringContext) return null
    const { round, config } = scoringContext
    const staleness = getStalenessLevel(
      round.completed_at,
      config.cadence_hours,
    )
    const relative = formatRelativeTime(round.completed_at)
    return (
      <div className={`scoring-freshness-footer ${staleness}`}>
        Scores from round #{round.round_number} — completed {relative}.
      </div>
    )
  }

  const content = validators ? (
    <>
      <table className="basic">
        <thead>
          <tr>
            <th className="pubkey">{t('pubkey')}</th>
            <th className="domain">{t('domain')}</th>
            {scoringEnabled ? (
              <th className="status">
                {t('status', { defaultValue: 'Status' })}
              </th>
            ) : (
              <th className="unl">{t('unl')}</th>
            )}
            <th className="version">{t('Version')}</th>
            {tab === 'uptime' ? (
              <>
                <th className="score h1">{t('1H')}</th>
                <th className="score h24">{t('24H')}</th>
                <th className="score d30">{t('30D')}</th>
              </>
            ) : (
              <>
                {' '}
                <th className="base">
                  <span>{t('base')}</span>
                </th>
                <th className="owner">{t('owner')}</th>
                <th className="base_fee">{t('base_fee')}</th>
              </>
            )}
            <th className="last-ledger">{t('ledger')}</th>
          </tr>
        </thead>
        <tbody>{validators.map(renderValidator)}</tbody>
      </table>
      {renderFreshnessFooter()}
    </>
  ) : (
    <Loader />
  )

  return <div className={`validators-table ${tab}-tab`}>{content}</div>
}
