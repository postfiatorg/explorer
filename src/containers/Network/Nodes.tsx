import { useContext, useMemo } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { Server, Globe, GitBranch, MapPinOff } from 'lucide-react'
import { Map } from './Map'
import { NodesTable } from './NodesTable'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { MetricCard } from '../shared/components/MetricCard/MetricCard'
import { CollapsiblePanel } from '../shared/components/CollapsiblePanel/CollapsiblePanel'
import Log from '../shared/log'
import {
  FETCH_INTERVAL_ERROR_MILLIS,
  FETCH_INTERVAL_NODES_MILLIS,
  isEarlierVersion,
} from '../shared/utils'
import { NodeData, NodeResponse } from '../shared/vhsTypes'
import NetworkContext from '../shared/NetworkContext'
import './css/style.scss'

export const ledgerCompare = (a: NodeData, b: NodeData) => {
  const aLedger = a.validated_ledger.ledger_index
  const bLedger = b.validated_ledger.ledger_index
  const compareVersion = isEarlierVersion(b.version, a.version) ? -1 : 1
  return bLedger === aLedger ? compareVersion : bLedger - aLedger
}

export const Nodes = () => {
  const { t } = useTranslation()
  const network = useContext(NetworkContext)

  const { data } = useQuery(['fetchNodesData'], async () => fetchData(), {
    refetchInterval: (returnedData, _) =>
      returnedData == null
        ? FETCH_INTERVAL_ERROR_MILLIS
        : FETCH_INTERVAL_NODES_MILLIS,
    enabled: !!network,
  })

  const fetchData = async () =>
    axios
      .get(`${process.env.VITE_DATA_URL}/topology/nodes/${network}`)
      .then((resp) => resp.data.nodes)
      .then((allNodes) => {
        const nodes: NodeData[] = allNodes.map((node: NodeResponse) => ({
          ...node,
          version: node.version?.startsWith('rippled')
            ? node.version.split('-').slice(1).join('-')
            : node.version,
          validated_ledger: {
            ledger_index: node.complete_ledgers
              ? Number(node.complete_ledgers.split('-')[1])
              : 0,
          },
          load_factor: node.load_factor_server
            ? Number(node.load_factor_server)
            : null,
        }))

        nodes.sort((a: NodeData, b: NodeData) => {
          if (a.server_state === b.server_state) {
            return ledgerCompare(a, b)
          }
          if (a.server_state && !b.server_state) {
            return -1
          }
          return 1
        })
        const nodesWithLocations = nodes.filter(
          (node: any) => 'lat' in node && 'long' in node,
        )
        return {
          nodes,
          unmapped: nodes.length - nodesWithLocations.length,
          locations: nodesWithLocations,
        }
      })
      .catch((e) => Log.error(e))

  const countryCount = useMemo(() => {
    if (!data?.locations) return 0
    const countries = new Set(
      data.locations.map((n: any) => n.country).filter(Boolean),
    )
    return countries.size
  }, [data?.locations])

  const uniqueVersions = useMemo(() => {
    if (!data?.nodes) return 0
    const versions = new Set(
      data.nodes.map((n: any) => n.version).filter(Boolean),
    )
    return versions.size
  }, [data?.nodes])

  return (
    <div className="network-page">
      <SEOHelmet
        title={t('nodes')}
        description={t('meta.nodes.description')}
        path="/network/nodes"
      />
      <div className="network-page-title">{t('nodes')}</div>

      <div className="network-stats">
        <MetricCard
          label="Total Nodes"
          value={data?.nodes?.length}
          icon={Server}
        />
        <MetricCard
          label="Countries"
          value={countryCount || undefined}
          icon={Globe}
        />
        <MetricCard
          label="Versions"
          value={uniqueVersions || undefined}
          icon={GitBranch}
        />
        <MetricCard label="Unmapped" value={data?.unmapped} icon={MapPinOff} />
      </div>

      <div className="dashboard-panel network-map-panel">
        {
          // @ts-ignore - Work around for complex type assignment issues
          <Map locations={data?.locations} />
        }
      </div>

      <CollapsiblePanel
        title={t('nodes')}
        defaultOpen
        count={data?.nodes?.length}
      >
        <NodesTable nodes={data?.nodes} />
      </CollapsiblePanel>
    </div>
  )
}
