import { FC } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  ScoringRoundMeta,
  classifyRoundState,
  deriveFailedAtStage,
  formatRelativeTime,
} from '../Network/scoringUtils'

interface RoundNavigationProps {
  viewingRoundNumber: number
  latestRoundNumber: number
  recentRounds: ScoringRoundMeta[]
  onSelectRound: (roundNumber: number) => void
}

const toneClass: Record<ReturnType<typeof classifyRoundState>, string> = {
  complete: 'round-nav-glyph-complete',
  failed: 'round-nav-glyph-failed',
  running: 'round-nav-glyph-running',
  published_warning: 'round-nav-glyph-published-warning',
}

const statusLabel: Record<ReturnType<typeof classifyRoundState>, string> = {
  complete: 'COMPLETE',
  failed: 'FAILED',
  running: 'RUNNING',
  published_warning: 'VL PUBLISHED · MEMO FAILED',
}

const tooltipFor = (round: ScoringRoundMeta): string => {
  const parts: string[] = [`Round #${round.round_number}`]
  const when = round.completed_at ?? round.started_at ?? round.created_at
  if (when) parts.push(formatRelativeTime(when))
  const state = classifyRoundState(round.status)
  parts.push(statusLabel[state])
  if (round.override_type) {
    parts.push(`override: ${round.override_type}`)
  }
  if (state === 'failed') {
    const stage = deriveFailedAtStage(round)
    if (stage) parts[parts.length - 1] = `FAILED at ${stage}`
  }
  return parts.join(' · ')
}

const STATE_SEGMENT_DEFAULTS: Record<
  ReturnType<typeof classifyRoundState>,
  string
> = {
  complete: '● COMPLETE',
  failed: '✕ FAILED',
  running: '● RUNNING',
  published_warning: '! VL published, memo failed',
}

const formatStateSegment = (round: ScoringRoundMeta): string => {
  const state = classifyRoundState(round.status)
  if (state === 'failed') {
    const stage = deriveFailedAtStage(round)
    return stage ? `✕ FAILED at ${stage}` : '✕ FAILED'
  }
  if (state === 'complete' && round.override_type) {
    return `● COMPLETE · ${round.override_type} override`
  }
  return STATE_SEGMENT_DEFAULTS[state]
}

const formatRelativeSegment = (round: ScoringRoundMeta): string => {
  const state = classifyRoundState(round.status)
  if (
    (state === 'complete' || state === 'published_warning') &&
    round.completed_at
  ) {
    return `completed ${formatRelativeTime(round.completed_at)}`
  }
  if (round.started_at) {
    return `started ${formatRelativeTime(round.started_at)}`
  }
  return ''
}

const CurrentRoundMeta: FC<{ round: ScoringRoundMeta }> = ({ round }) => {
  const state = classifyRoundState(round.status)
  const relative = formatRelativeSegment(round)
  const stateSegment = formatStateSegment(round)
  const stateClass =
    round.override_type && state === 'complete'
      ? 'round-nav-meta-state-override'
      : `round-nav-meta-state-${state.replace(/_/g, '-')}`
  return (
    <span className="round-nav-meta">
      <span className="round-nav-round-number">
        Round #{round.round_number}
      </span>
      <span className="round-nav-meta-sep">·</span>
      <span className={`round-nav-meta-state ${stateClass}`}>
        {stateSegment}
      </span>
      {relative && (
        <>
          <span className="round-nav-meta-sep">·</span>
          <span className="round-nav-meta-relative">{relative}</span>
        </>
      )}
    </span>
  )
}

export const RoundNavigation: FC<RoundNavigationProps> = ({
  viewingRoundNumber,
  latestRoundNumber,
  recentRounds,
  onSelectRound,
}) => {
  const viewingRound = recentRounds.find(
    (r) => r.round_number === viewingRoundNumber,
  )

  const roundNumbers = recentRounds.map((r) => r.round_number)
  const minFetched = roundNumbers.length > 0 ? Math.min(...roundNumbers) : 0
  const maxFetched = roundNumbers.length > 0 ? Math.max(...roundNumbers) : 0
  const prevDisabled = viewingRoundNumber <= minFetched
  const nextDisabled =
    viewingRoundNumber >= Math.max(latestRoundNumber, maxFetched)

  const handlePrev = () => {
    if (prevDisabled) return
    onSelectRound(viewingRoundNumber - 1)
  }

  const handleNext = () => {
    if (nextDisabled) return
    onSelectRound(viewingRoundNumber + 1)
  }

  // Render oldest → newest left-to-right so prev/next arrows and reading direction agree.
  const glyphRounds = recentRounds.slice().reverse()

  return (
    <div className="round-nav dashboard-panel">
      <div className="round-nav-top">
        <button
          type="button"
          className="round-nav-arrow"
          onClick={handlePrev}
          disabled={prevDisabled}
          aria-label="Previous round"
        >
          <ChevronLeft size={18} />
          <span>Prev</span>
        </button>
        {viewingRound ? (
          <CurrentRoundMeta round={viewingRound} />
        ) : (
          <span className="round-nav-meta round-nav-meta-placeholder">
            Round #{viewingRoundNumber}
          </span>
        )}
        <button
          type="button"
          className="round-nav-arrow"
          onClick={handleNext}
          disabled={nextDisabled}
          aria-label="Next round"
        >
          <span>Next</span>
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="round-nav-strip">
        <span className="round-nav-strip-label">Recent rounds</span>
        <div className="round-nav-strip-glyphs">
          {glyphRounds.map((round) => {
            const state = classifyRoundState(round.status)
            const isCurrent = round.round_number === viewingRoundNumber
            let symbol = '●'
            if (state === 'failed') symbol = '✕'
            else if (state === 'published_warning') symbol = '!'
            const glyphToneClass =
              round.override_type && state === 'complete'
                ? 'round-nav-glyph-override'
                : toneClass[state]
            return (
              <button
                type="button"
                key={round.round_number}
                className={`round-nav-glyph ${glyphToneClass} ${isCurrent ? 'round-nav-glyph-current' : ''}`}
                onClick={() => onSelectRound(round.round_number)}
                aria-label={tooltipFor(round)}
                aria-current={isCurrent ? 'true' : undefined}
                title={tooltipFor(round)}
              >
                <span aria-hidden="true">{symbol}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
