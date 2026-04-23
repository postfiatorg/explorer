import axios from 'axios'
import { useContext, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { Loader } from '../shared/components/Loader'
import NetworkContext from '../shared/NetworkContext'
import { ValidatorResponse } from '../shared/vhsTypes'
import { ScoringContext } from '../Network/scoringUtils'
import { useScoringContext } from '../Network/useScoringContext'
import { ScoringBanner } from './ScoringBanner'
import { RankedTable, ValidatorMeta } from './RankedTable'
import { RoundNavigation } from './RoundNavigation'
import { AuditTrailPanel } from './AuditTrailPanel'
import { useRoundView } from './useRoundView'
import { useRecentRounds } from './useRecentRounds'
import './css/unlScoring.scss'

interface VhsValidatorsResponse {
  validators: ValidatorResponse[]
}

export const UNLScoring = () => {
  const { t } = useTranslation()
  const network = useContext(NetworkContext)
  const { context: latestContext, latestAttempt, health } = useScoringContext()

  const latestRoundNumber = latestContext?.round.round_number

  // null = "follow latest", any number = user explicitly selected a round.
  const [selectedRoundNumber, setSelectedRoundNumber] = useState<number | null>(
    null,
  )

  // Auto-advance: if the user hasn't selected anything, track latest.
  // If they selected the latest round explicitly, re-enable auto-advance.
  useEffect(() => {
    if (
      selectedRoundNumber !== null &&
      selectedRoundNumber === latestRoundNumber
    ) {
      setSelectedRoundNumber(null)
    }
  }, [selectedRoundNumber, latestRoundNumber])

  const viewingRoundNumber = selectedRoundNumber ?? latestRoundNumber

  const recentRounds = useRecentRounds()
  const { view: viewingRound } = useRoundView(viewingRoundNumber)

  // If a later COMPLETE round exists in the recent window, this round's VL has
  // already been superseded; surface when the supersession happened. For rounds
  // older than the 15-round window, the matched successor may not be the direct
  // one — the date is then a conservative upper bound rather than exact.
  const supersedingRound = useMemo(() => {
    if (!viewingRound) return null
    const candidates = recentRounds
      .filter(
        (r) =>
          r.round_number > viewingRound.round.round_number &&
          r.status === 'COMPLETE' &&
          r.completed_at,
      )
      .sort((a, b) => a.round_number - b.round_number)
    return candidates[0] ?? null
  }, [recentRounds, viewingRound])

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

  // Build a ScoringContext from the viewing round so RankedTable / drill-down
  // re-render for whatever round the user is looking at, while the banner above
  // stays bound to the latest-pipeline context.
  const viewingContext = useMemo<ScoringContext | null>(() => {
    if (!viewingRound || !latestContext) return null
    return {
      unl: {
        round_number: viewingRound.round.round_number,
        unl: viewingRound.unl.unl,
        alternates: viewingRound.unl.alternates,
      },
      scores: viewingRound.scores,
      round: viewingRound.round,
      config: latestContext.config,
    }
  }, [viewingRound, latestContext])

  const body = latestContext ? (
    <>
      <ScoringBanner
        context={latestContext}
        latestAttempt={latestAttempt}
        health={health}
      />
      {typeof viewingRoundNumber === 'number' &&
        typeof latestRoundNumber === 'number' && (
          <RoundNavigation
            viewingRoundNumber={viewingRoundNumber}
            latestRoundNumber={latestRoundNumber}
            recentRounds={recentRounds}
            onSelectRound={(n) =>
              setSelectedRoundNumber(n === latestRoundNumber ? null : n)
            }
          />
        )}
      {viewingContext && viewingRound ? (
        <>
          <RankedTable
            context={viewingContext}
            priorScores={viewingRound.priorScores}
            priorUnl={viewingRound.priorUnl}
            snapshot={viewingRound.snapshot}
            validatorMetaByKey={validatorMetaByKey}
          />
          <AuditTrailPanel
            round={viewingRound.round}
            supersedingRound={supersedingRound}
          />
        </>
      ) : (
        <div className="unl-scoring-empty">
          <Loader />
        </div>
      )}
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
