import axios from 'axios'
import { useContext, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { Loader } from '../shared/components/Loader'
import NetworkContext from '../shared/NetworkContext'
import { ValidatorResponse } from '../shared/vhsTypes'
import { useScoringContext } from '../Network/useScoringContext'
import { ScoringBanner } from './ScoringBanner'
import { RankedTable, ValidatorMeta } from './RankedTable'
import './css/unlScoring.scss'

interface VhsValidatorsResponse {
  validators: ValidatorResponse[]
}

export const UNLScoring = () => {
  const { t } = useTranslation()
  const network = useContext(NetworkContext)
  const {
    context: scoringContext,
    latestAttempt,
    priorScores,
    priorUnl,
    health,
  } = useScoringContext()

  const { data: vhsValidators } = useQuery<ValidatorResponse[] | null>(
    ['unl-scoring-vhs-validators', network],
    async () => {
      try {
        const resp = await axios.get<VhsValidatorsResponse>(
          `${process.env.VITE_DATA_URL}/validators/${network}`,
        )
        return resp.data.validators ?? []
      } catch {
        return null
      }
    },
    {
      enabled: !!network,
      staleTime: 5 * 60 * 1000,
      refetchInterval: 5 * 60 * 1000,
      retry: false,
    },
  )

  const validatorMetaByKey = useMemo<Map<string, ValidatorMeta>>(() => {
    const map = new Map<string, ValidatorMeta>()
    if (!vhsValidators) return map
    vhsValidators.forEach((v) => {
      const key = v.master_key || v.signing_key
      if (!key) return
      map.set(key, {
        domain: v.domain || null,
        domainVerified: Boolean(v.domain_verified),
      })
    })
    return map
  }, [vhsValidators])

  const body = scoringContext ? (
    <>
      <ScoringBanner
        context={scoringContext}
        latestAttempt={latestAttempt}
        health={health}
      />
      <RankedTable
        context={scoringContext}
        priorScores={priorScores}
        priorUnl={priorUnl}
        validatorMetaByKey={validatorMetaByKey}
      />
    </>
  ) : (
    <div className="unl-scoring-empty">
      <Loader />
    </div>
  )

  return (
    <div className="unl-scoring-page">
      <SEOHelmet
        title={t('unl_scoring')}
        description="Dynamic UNL scoring rounds — ranked validators, scoring dimensions, and pipeline health for the PFT Ledger."
        path="/unl-scoring"
      />
      <div className="network-page-title">{t('unl_scoring')}</div>
      {body}
    </div>
  )
}
