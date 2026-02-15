import axios from 'axios'
import { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import Log from '../shared/log'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { MetricCard } from '../shared/components/MetricCard/MetricCard'
import { Tabs } from '../shared/components/Tabs'
import NetworkContext from '../shared/NetworkContext'
import {
  FETCH_INTERVAL_ERROR_MILLIS,
  FETCH_INTERVAL_VHS_MILLIS,
} from '../shared/utils'
import { AMENDMENTS_ROUTE } from '../App/routes'
import { useRouteParams, buildPath } from '../shared/routing'
import { AmendmentsTable } from './AmendmentsTable'
import './amendmentsTable.scss'

export const Amendments = () => {
  const network = useContext(NetworkContext)
  const { t } = useTranslation()
  const { tab = 'enabled' } = useRouteParams(AMENDMENTS_ROUTE)

  const { data } = useQuery(
    ['fetchNetworkAmendmentsData'],
    async () => fetchData(),
    {
      refetchInterval: (returnedData, _) =>
        returnedData == null
          ? FETCH_INTERVAL_ERROR_MILLIS
          : FETCH_INTERVAL_VHS_MILLIS,
      refetchOnMount: true,
      enabled: !!network,
    },
  )

  const fetchData = async () =>
    axios
      .get(`${process.env.VITE_DATA_URL}/amendments/vote/${network}`)
      .then((resp) => resp.data.amendments)
      .then((amendments) =>
        amendments.sort((a, b) => {
          if (a.eta && !b.eta) return -1
          if (!a.eta && b.eta) return 1
          if (a.voted && !b.voted) return -1
          if (!a.voted && b.voted) return 1
          return 0
        }),
      )
      .catch((e) => Log.error(e))

  const { enabledAmendments, votingAmendments } = useMemo(() => {
    if (!data)
      return { enabledAmendments: undefined, votingAmendments: undefined }
    return {
      enabledAmendments: data.filter((a: any) => !a.voted),
      votingAmendments: data.filter((a: any) => a.voted),
    }
  }, [data])

  const stats = useMemo(() => {
    if (!data) return { total: 0, enabled: 0, voting: 0, withEta: 0 }
    const enabled = data.filter((a: any) => !a.voted).length
    const voting = data.filter((a: any) => a.voted && !a.eta).length
    const withEta = data.filter((a: any) => a.eta).length
    return { total: data.length, enabled, voting, withEta }
  }, [data])

  return (
    <div className="amendments-page">
      <SEOHelmet
        title={t('amendments')}
        description={t('meta.amendments.description')}
        path="/amendments"
      />
      <div className="amendments-page-title">{t('amendments')}</div>

      <div className="amendments-stats">
        <MetricCard label="Total" value={stats.total || undefined} />
        <MetricCard label="Enabled" value={stats.enabled || undefined} />
        <MetricCard label="In Voting" value={stats.voting || undefined} />
        <MetricCard label="With ETA" value={stats.withEta || undefined} />
      </div>

      <div className="dashboard-panel">
        <Tabs
          tabs={['enabled', 'in-voting']}
          selected={tab}
          path={buildPath(AMENDMENTS_ROUTE, {})}
        />
        {tab === 'enabled' ? (
          <AmendmentsTable amendments={enabledAmendments} mode="enabled" />
        ) : (
          <AmendmentsTable amendments={votingAmendments} mode="voting" />
        )}
      </div>
    </div>
  )
}
