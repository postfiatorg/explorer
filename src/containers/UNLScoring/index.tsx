import axios from 'axios'
import { useContext, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from 'react-query'
import { useParams } from 'react-router'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
import { MethodologyExplainer } from './MethodologyExplainer'
import { useRoundView } from './useRoundView'
import { useRecentRounds } from './useRecentRounds'
import './css/unlScoring.scss'

interface VhsValidatorsResponse {
  validators: ValidatorResponse[]
}

const BASE_PATH = '/unl-scoring'

const buildScoringUrl = (
  roundNumber: number | null,
  latestRoundNumber: number | undefined,
  validatorPubkeys: string[],
): string => {
  const isLatest =
    roundNumber === null ||
    (typeof latestRoundNumber === 'number' && roundNumber === latestRoundNumber)
  const path = isLatest ? BASE_PATH : `${BASE_PATH}/rounds/${roundNumber}`
  const query =
    validatorPubkeys.length > 0
      ? `?validator=${validatorPubkeys.join(',')}`
      : ''
  return `${path}${query}`
}

const parseValidatorParam = (raw: string | null): string[] => {
  if (!raw) return []
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0)
}

export const UNLScoring = () => {
  const { t } = useTranslation()
  const network = useContext(NetworkContext)
  const { context: latestContext, latestAttempt, health } = useScoringContext()
  const navigate = useNavigate()
  const { roundId: roundIdParam } = useParams<{ roundId?: string }>()
  const [searchParams] = useSearchParams()
  const rawValidatorParam = searchParams.get('validator')
  const validatorList = useMemo(
    () => parseValidatorParam(rawValidatorParam),
    [rawValidatorParam],
  )

  const latestRoundNumber = latestContext?.round.round_number

  // undefined → follow latest (bare path); null → invalid segment;
  // number → pinned to that round.
  const parsedRoundId = useMemo<number | null | undefined>(() => {
    if (roundIdParam === undefined) return undefined
    if (!/^\d+$/.test(roundIdParam)) return null
    const n = Number(roundIdParam)
    return n >= 1 ? n : null
  }, [roundIdParam])

  const isPinned = typeof parsedRoundId === 'number'
  const viewingRoundNumber = isPinned ? parsedRoundId : latestRoundNumber

  const recentRounds = useRecentRounds()
  const { view: viewingRound, roundNotFound: viewNotFound } =
    useRoundView(viewingRoundNumber)

  const tooLarge =
    isPinned &&
    typeof latestRoundNumber === 'number' &&
    (parsedRoundId as number) > latestRoundNumber

  const isRoundNotFound =
    parsedRoundId === null || tooLarge || (isPinned && viewNotFound)

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

  // Resolve the validator param against the viewing round's scores. Unknown
  // pubkeys are silently ignored at render time but are kept in the URL so
  // they survive round navigation to rounds where they do exist.
  const expandedMasterKeys = useMemo<Set<string>>(() => {
    if (!viewingRound || validatorList.length === 0) return new Set()
    const known = new Set(
      viewingRound.scores.validator_scores.map((v) => v.master_key),
    )
    return new Set(validatorList.filter((pubkey) => known.has(pubkey)))
  }, [validatorList, viewingRound])

  // The first pubkey in URL order that exists in the current round — used as
  // the scroll target so a shareable link lands on the primary validator.
  const firstKnownPubkey = useMemo<string | null>(() => {
    if (!viewingRound || validatorList.length === 0) return null
    const known = new Set(
      viewingRound.scores.validator_scores.map((v) => v.master_key),
    )
    return validatorList.find((pubkey) => known.has(pubkey)) ?? null
  }, [validatorList, viewingRound])

  const handleSelectRound = (roundNumber: number) => {
    // Round navigation pushes history so Back steps through prior rounds.
    navigate(buildScoringUrl(roundNumber, latestRoundNumber, validatorList))
  }

  const handleToggleValidator = (masterKey: string) => {
    // Drill-down toggles replace history so Back skips expand/collapse noise.
    const nextList = validatorList.includes(masterKey)
      ? validatorList.filter((pubkey) => pubkey !== masterKey)
      : [...validatorList, masterKey]
    const pinnedRoundNumber = isPinned ? (parsedRoundId as number) : null
    navigate(buildScoringUrl(pinnedRoundNumber, latestRoundNumber, nextList), {
      replace: true,
    })
  }

  // Scroll the primary drill-down into view when it changes — on initial
  // load, on round navigation, or when the first-known pubkey itself changes.
  // Toggling a later-in-list pubkey leaves the first unchanged and does not
  // re-scroll, so users aren't yanked around on every click.
  useEffect(() => {
    if (!firstKnownPubkey) return undefined
    const raf = window.requestAnimationFrame(() => {
      const el = document.querySelector(
        `[data-drilldown-key="${firstKnownPubkey}"]`,
      ) as HTMLElement | null
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(raf)
  }, [firstKnownPubkey, viewingRound?.round.round_number])

  const renderNotFound = () => (
    <div className="unl-scoring-not-found dashboard-panel">
      <h2>Round not found</h2>
      <p>
        No scoring round exists for this URL. Use the round navigation or open{' '}
        <a href={BASE_PATH}>the latest round</a>.
      </p>
    </div>
  )

  let body: JSX.Element
  if (isRoundNotFound) {
    body = latestContext ? (
      <>
        <ScoringBanner
          context={latestContext}
          latestAttempt={latestAttempt}
          health={health}
        />
        {renderNotFound()}
      </>
    ) : (
      renderNotFound()
    )
  } else if (!latestContext) {
    body = (
      <div className="unl-scoring-empty">
        <Loader />
      </div>
    )
  } else {
    body = (
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
              onSelectRound={handleSelectRound}
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
              expandedMasterKeys={expandedMasterKeys}
              onToggleValidator={handleToggleValidator}
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
        <MethodologyExplainer config={latestContext.config} />
      </>
    )
  }

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
