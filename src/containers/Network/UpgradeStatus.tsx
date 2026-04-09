import { useContext, useMemo } from 'react'
import axios from 'axios'
import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Users, CheckCircle, Tag } from 'lucide-react'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { MetricCard } from '../shared/components/MetricCard/MetricCard'
import {
  FETCH_INTERVAL_MILLIS,
  FETCH_INTERVAL_ERROR_MILLIS,
  isEarlierVersion,
} from '../shared/utils'
import Log from '../shared/log'
import { ValidatorResponse } from '../shared/vhsTypes'
import NetworkContext from '../shared/NetworkContext'
import { RouteLink } from '../shared/routing'
import { VALIDATOR_ROUTE } from '../App/routes'
import DomainLink from '../shared/components/DomainLink'
import { Loader } from '../shared/components/Loader'
import './css/upgradeStatus.scss'

interface VersionStat {
  version: string
  count: number
  percentage: number
  isLatest: boolean
}

const VERSION_COLORS = [
  'var(--green-50)',
  'var(--blue-purple-50)',
  'var(--blue-50)',
  'var(--magenta-50)',
  'var(--orange-50)',
  'var(--yellow-50)',
]

const aggregateVersions = (
  validators: ValidatorResponse[],
  latestVersion: string | null,
): VersionStat[] => {
  const counts: Record<string, number> = {}
  let total = 0

  validators.forEach((v) => {
    if (!v.signing_key) return
    total += 1
    const version = v.server_version || 'Unknown'
    counts[version] = (counts[version] || 0) + 1
  })

  return Object.entries(counts)
    .map(([version, count]) => ({
      version,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      isLatest: version === latestVersion,
    }))
    .sort((a, b) => {
      if (a.isLatest !== b.isLatest) return a.isLatest ? -1 : 1
      if (a.version === 'Unknown') return 1
      if (b.version === 'Unknown') return -1
      return isEarlierVersion(a.version, b.version) ? 1 : -1
    })
}

const sortValidatorsByVersion = (
  validators: ValidatorResponse[],
  latestVersion: string | null,
): ValidatorResponse[] =>
  [...validators]
    .filter((v) => v.signing_key)
    .sort((a, b) => {
      const aVer = a.server_version || 'Unknown'
      const bVer = b.server_version || 'Unknown'
      const aIsLatest = aVer === latestVersion
      const bIsLatest = bVer === latestVersion
      if (aIsLatest !== bIsLatest) return aIsLatest ? -1 : 1
      if (aVer === 'Unknown') return 1
      if (bVer === 'Unknown') return -1
      if (aVer !== bVer) {
        return isEarlierVersion(aVer, bVer) ? 1 : -1
      }
      const aUnl = a.unl ? 0 : 1
      const bUnl = b.unl ? 0 : 1
      if (aUnl !== bUnl) return aUnl - bUnl
      const aDomain = a.domain || 'zzz'
      const bDomain = b.domain || 'zzz'
      return aDomain.localeCompare(bDomain)
    })

export const UpgradeStatus = () => {
  const { t } = useTranslation()
  const network = useContext(NetworkContext)

  const { data: validators, isLoading } = useQuery(
    ['upgradeStatusValidators', network],
    () =>
      axios
        .get(`${process.env.VITE_DATA_URL}/validators/${network}`)
        .then((resp) => resp.data.validators as ValidatorResponse[]),
    {
      refetchInterval: (returnedData) =>
        returnedData == null
          ? FETCH_INTERVAL_ERROR_MILLIS
          : FETCH_INTERVAL_MILLIS,
      refetchOnMount: true,
      enabled: process.env.VITE_ENVIRONMENT !== 'custom' || !!network,
      onError: (e) => Log.error(e),
    },
  )

  const { data: latestVersion } = useQuery(
    ['latestVersion', network],
    () =>
      axios
        .get(`/api/v1/latest-version/${network}`)
        .then((resp) => resp.data.version as string),
    {
      enabled: !!network,
      staleTime: 60 * 60 * 1000,
      onError: (e) => Log.error(e),
    },
  )

  const resolvedLatest = latestVersion ?? null

  const versionStats = useMemo(
    () => aggregateVersions(validators ?? [], resolvedLatest),
    [validators, resolvedLatest],
  )

  const sortedValidators = useMemo(
    () => sortValidatorsByVersion(validators ?? [], resolvedLatest),
    [validators, resolvedLatest],
  )

  const totalValidators = versionStats.reduce((sum, v) => sum + v.count, 0)
  const onLatestCount = resolvedLatest
    ? (versionStats.find((v) => v.version === resolvedLatest)?.count ?? 0)
    : 0
  const onLatestPercent =
    totalValidators > 0
      ? `${((onLatestCount / totalValidators) * 100).toFixed(0)}%`
      : undefined

  const getVersionColor = (version: string): string => {
    const idx = versionStats.findIndex((v) => v.version === version)
    return idx >= 0 ? VERSION_COLORS[idx % VERSION_COLORS.length] : ''
  }

  return (
    <div className="network-page">
      <SEOHelmet
        title={t('upgrade_status')}
        description={t('meta.upgrade_status.description')}
        path="/network/upgrade-status"
      />
      <div className="network-page-title">{t('upgrade_status')}</div>

      {isLoading || !validators ? (
        <Loader />
      ) : (
        <>
          <div className="network-stats">
            <MetricCard
              label="Validators"
              value={totalValidators || undefined}
              icon={Users}
            />
            <MetricCard
              label="On Latest"
              value={onLatestPercent}
              icon={CheckCircle}
            />
            <MetricCard
              label="Latest Version"
              value={resolvedLatest ?? '—'}
              icon={Tag}
            />
          </div>

          <div className="dashboard-panel">
            <h3 className="dashboard-panel-title">Version Distribution</h3>
            <div className="version-distribution">
              {versionStats.length === 0 ? (
                <div className="dashboard-panel-empty">
                  No version data available
                </div>
              ) : (
                <>
                  <div className="version-bar">
                    {versionStats.map((stat, i) => (
                      <div
                        key={stat.version}
                        className="version-bar-segment"
                        style={{
                          width: `${stat.percentage}%`,
                          backgroundColor:
                            VERSION_COLORS[i % VERSION_COLORS.length],
                        }}
                        title={`${stat.version}: ${stat.count}`}
                      />
                    ))}
                  </div>
                  <div className="version-list">
                    {versionStats.map((stat, i) => (
                      <div key={stat.version} className="version-row">
                        <span
                          className="version-dot"
                          style={{
                            backgroundColor:
                              VERSION_COLORS[i % VERSION_COLORS.length],
                          }}
                        />
                        <span
                          className={`version-label${stat.isLatest ? ' version-label-latest' : ''}`}
                        >
                          {stat.version}
                          {stat.isLatest && (
                            <span className="version-latest-badge">latest</span>
                          )}
                        </span>
                        <span className="version-count">{stat.count}</span>
                        <span className="version-pct">
                          {stat.percentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="dashboard-panel">
            <h3 className="dashboard-panel-title">Validators by Version</h3>
            <div className="upgrade-table-wrap">
              <table className="basic upgrade-table">
                <thead>
                  <tr>
                    <th className="ut-version">{t('Version')}</th>
                    <th className="ut-pubkey">{t('pubkey')}</th>
                    <th className="ut-domain">{t('domain')}</th>
                    <th className="ut-unl">{t('unl')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedValidators.map((v) => {
                    const pubkey = v.master_key || v.signing_key
                    const version = v.server_version || 'Unknown'
                    const color = getVersionColor(version)
                    return (
                      <tr key={pubkey}>
                        <td className="ut-version">
                          <span
                            className="version-dot"
                            style={{ backgroundColor: color }}
                          />
                          <span
                            className={
                              version === resolvedLatest
                                ? 'ut-version-text ut-version-latest'
                                : 'ut-version-text'
                            }
                          >
                            {version}
                          </span>
                        </td>
                        <td className="ut-pubkey text-truncate" title={pubkey}>
                          <RouteLink
                            to={VALIDATOR_ROUTE}
                            params={{ identifier: pubkey }}
                          >
                            {pubkey}
                          </RouteLink>
                        </td>
                        <td className="ut-domain text-truncate">
                          {v.domain && <DomainLink domain={v.domain} />}
                        </td>
                        <td className="ut-unl">
                          {v.unl ? (
                            <span className="ut-unl-yes">UNL</span>
                          ) : (
                            <span className="ut-unl-no">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
