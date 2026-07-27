import { FC, ReactNode, useEffect, useState } from 'react'
import {
  FailedAtStage,
  INDEPENDENT_VERIFICATION_ANCHOR_ID,
  ScoringRoundMeta,
  VL_PUBLISHED_MEMO_FAILED_STATUS,
  deriveFailedAtStage,
  formatLocalDateTime,
  formatRelativeTime,
  getRoundInputPackageCid,
} from '../Network/scoringUtils'
import { buildTimelineModel, formatCountdown } from './CommitRevealTimeline'
import { useScoringConfig } from './useScoringConfig'

const TICK_MS = 1000

export type LifecycleStepKey =
  | 'evidence'
  | 'scoring'
  | 'verification'
  | 'publishing'
  | 'complete'

interface LifecycleStep {
  key: LifecycleStepKey
  label: string
}

const LIFECYCLE_STEPS: LifecycleStep[] = [
  { key: 'evidence', label: 'Evidence' },
  { key: 'scoring', label: 'Scoring' },
  { key: 'verification', label: 'Verification' },
  { key: 'publishing', label: 'Publishing' },
  { key: 'complete', label: 'Complete' },
]

// Where each backend round status sits on the public lifecycle. The service's
// state machine is finer-grained than what a reader needs, so several statuses
// collapse onto one step; anything unrecognized starts at evidence collection,
// which is where every round begins.
const STEP_BY_STATUS: Record<string, LifecycleStepKey> = {
  COLLECTING: 'evidence',
  INPUT_FROZEN: 'scoring',
  SCORED: 'scoring',
  SELECTED: 'scoring',
  VL_SIGNED: 'scoring',
  AWAITING_COMMIT_CLOSE: 'verification',
  IPFS_PUBLISHED: 'publishing',
  VL_DISTRIBUTED: 'publishing',
  ONCHAIN_PUBLISHED: 'publishing',
  // Terminal and operationally published — its VL is live, only the on-chain
  // memo is missing — so it reads as complete rather than still publishing.
  [VL_PUBLISHED_MEMO_FAILED_STATUS]: 'complete',
  COMPLETE: 'complete',
}

const HEADLINE: Record<LifecycleStepKey, string> = {
  evidence: 'Gathering validator evidence',
  scoring: 'Scoring validators',
  verification: 'Validators are verifying this round',
  publishing: 'Verification closed — publishing results',
  complete: 'Round complete',
}

const NOTE: Record<LifecycleStepKey, ReactNode> = {
  evidence:
    "Live network data for every validator is being collected and frozen as this round's input.",
  scoring:
    'The frozen evidence is pinned and public; the scoring model is now evaluating every validator on it.',
  verification: (
    <>
      Scores stay sealed while validators independently re-run the round and
      commit their answers on chain — follow it live in{' '}
      <a href={`#${INDEPENDENT_VERIFICATION_ANCHOR_ID}`}>
        Independent verification
      </a>{' '}
      below.
    </>
  ),
  publishing:
    'The audit bundle, the signed validator list, and the on-chain record are being published. Ranked scores appear in a moment.',
  complete: 'Loading ranked scores…',
}

// Which step a failure stopped at, keyed by the stage the scoring service
// reported. Deliberately not the same mapping as STEP_BY_STATUS above: a round
// whose status is INPUT_FROZEN is on to scoring, but a round that failed while
// freezing never finished collecting evidence, so it belongs to that step.
const FAILED_STEP_BY_STAGE: Record<FailedAtStage, LifecycleStepKey> = {
  COLLECTING: 'evidence',
  INPUT_FROZEN: 'evidence',
  SCORED: 'scoring',
  SELECTED: 'scoring',
  VL_SIGNED: 'scoring',
  AWAITING_COMMIT_CLOSE: 'verification',
  IPFS_PUBLISHED: 'publishing',
  VL_DISTRIBUTED: 'publishing',
  ONCHAIN_PUBLISHED: 'publishing',
}

// What a failure at each step cost. A round that reached verification or
// publishing had already produced scores, so claiming none were produced there
// would be false; a failure with no reported step claims nothing at all.
const FAILED_STEP_LEAD: Partial<Record<LifecycleStepKey, string>> = {
  evidence: 'No scores were produced.',
  scoring: 'No scores were produced.',
  verification: 'No results were published.',
  publishing: 'No results were published.',
}

const FAILED_STEP_PHRASE: Record<LifecycleStepKey, string> = {
  evidence: 'while gathering evidence',
  scoring: 'during scoring',
  verification: 'during verification',
  publishing: 'while publishing results',
  complete: '',
}

export const resolveLifecycleStep = (
  round: ScoringRoundMeta,
): LifecycleStepKey => {
  const mapped = STEP_BY_STATUS[round.status]
  if (mapped) return mapped
  // A round whose inputs are frozen has at least reached scoring; otherwise it
  // is still collecting. Keeps unknown or future statuses on a sensible step.
  return getRoundInputPackageCid(round) ? 'scoring' : 'evidence'
}

// Null when the round reported no stage — a restart-abandoned round records
// none — so the panel states the failure without claiming a step.
export const resolveFailedStep = (
  round: ScoringRoundMeta,
): LifecycleStepKey | null => {
  const stage = deriveFailedAtStage(round)
  return stage ? FAILED_STEP_BY_STAGE[stage] : null
}

const useTicker = (intervalMs: number): number => {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return tick
}

// Time until validator results unlock, i.e. until the reveal window closes.
// Built on the same window model the audit-trail timeline draws from, so the
// countdown and the timeline can never disagree. Returns null when the round
// never froze inputs or the deployment predates the commit-reveal windows, so
// the countdown hides itself rather than guessing.
export const formatUnlockCountdown = (
  frozenAtIso: string | null | undefined,
  commitWindowSeconds: number | null | undefined,
  revealWindowSeconds: number | null | undefined,
  revealGapSeconds: number | null | undefined,
  nowMs: number,
): string | null => {
  const model = buildTimelineModel(
    frozenAtIso,
    commitWindowSeconds,
    revealWindowSeconds,
    revealGapSeconds,
    false,
    nowMs,
  )
  if (!model) return null

  const remainingMs = model.revealEndMs - nowMs
  return remainingMs > 0 ? formatCountdown(remainingMs) : null
}

type StepState = 'done' | 'active' | 'pending' | 'failed' | 'unknown'

const STEP_STATE_LABEL: Record<StepState, string> = {
  done: 'completed',
  active: 'in progress',
  pending: 'not started',
  failed: 'failed',
  unknown: 'state unknown',
}

const stepStates = (
  currentKey: LifecycleStepKey | null,
  failed: boolean,
): Record<LifecycleStepKey, StepState> => {
  const states = {} as Record<LifecycleStepKey, StepState>

  // A failure whose stage was never recorded leaves every step unresolved:
  // marking one would assert a step the round never reported.
  if (!currentKey) {
    LIFECYCLE_STEPS.forEach((step) => {
      states[step.key] = 'unknown'
    })
    return states
  }

  const currentIndex = LIFECYCLE_STEPS.findIndex((s) => s.key === currentKey)

  LIFECYCLE_STEPS.forEach((step, index) => {
    if (index < currentIndex) {
      states[step.key] = 'done'
    } else if (index > currentIndex) {
      states[step.key] = 'pending'
    } else if (failed) {
      states[step.key] = 'failed'
    } else {
      states[step.key] = currentKey === 'complete' ? 'done' : 'active'
    }
  })

  return states
}

const StepMarkers: FC<{
  currentKey: LifecycleStepKey | null
  failed: boolean
}> = ({ currentKey, failed }) => {
  const states = stepStates(currentKey, failed)

  return (
    <ol className="rl-steps">
      {LIFECYCLE_STEPS.map((step, index) => {
        const state = states[step.key]
        const previousDone =
          index > 0 && states[LIFECYCLE_STEPS[index - 1].key] === 'done'

        let marker: string
        if (state === 'done') marker = '✓'
        else if (state === 'failed') marker = '✕'
        else marker = String(index + 1)

        return (
          <li
            className={`rl-step rl-step-${state}`}
            key={step.key}
            aria-current={state === 'active' ? 'step' : undefined}
          >
            {index > 0 && (
              <span
                className={`rl-line${previousDone ? ' rl-line-done' : ''}`}
                aria-hidden="true"
              />
            )}
            <span className="rl-step-body">
              <span className="rl-marker" aria-hidden="true">
                {marker}
              </span>
              <span className="rl-step-label">{step.label}</span>
              {/* The marker glyph and colors are decorative, so the step's
                  state reaches assistive technology only through this text. */}
              <span className="rl-step-state">{STEP_STATE_LABEL[state]}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}

interface RoundLifecycleProps {
  round: ScoringRoundMeta
  // A failed round renders the same progression, stopped at the step it died on.
  failed?: boolean
}

export const RoundLifecycle: FC<RoundLifecycleProps> = ({
  round,
  failed = false,
}) => {
  const now = useTicker(TICK_MS)
  const config = useScoringConfig()

  // A failed round resolves to the step it reported failing at, which is null
  // when it reported no stage; an in-flight round always resolves to a step.
  const activeStep = resolveLifecycleStep(round)
  const failedStep = failed ? resolveFailedStep(round) : null
  const currentKey = failed ? failedStep : activeStep

  const countdown =
    !failed && activeStep === 'verification'
      ? formatUnlockCountdown(
          round.input_frozen_at,
          config?.announcement_commit_window_seconds,
          config?.announcement_reveal_window_seconds,
          config?.announcement_reveal_gap_seconds,
          now,
        )
      : null

  const startedAt = round.started_at ?? round.created_at ?? null
  const frozenAt = round.input_frozen_at ?? null

  let statusWord: string
  if (failed) statusWord = 'failed'
  else if (activeStep === 'complete') statusWord = 'complete'
  else statusWord = 'in progress'

  let headline: string
  if (failed) {
    const phrase = failedStep ? FAILED_STEP_PHRASE[failedStep] : ''
    headline = phrase ? `Round failed ${phrase}` : 'Round failed'
  } else {
    headline = HEADLINE[activeStep]
  }

  let chip: JSX.Element | null = null
  if (failed) {
    const failedAt = round.completed_at ?? startedAt
    chip = failedAt ? (
      <span className="rl-chip">{formatLocalDateTime(failedAt)}</span>
    ) : null
  } else if (countdown) {
    chip = (
      <span className="rl-chip">
        <span className="rl-chip-dot" aria-hidden="true" />
        <span className="rl-chip-label">results unlock in</span>
        <strong className="rl-chip-value">{countdown}</strong>
      </span>
    )
  } else if (activeStep === 'complete') {
    chip = round.completed_at ? (
      <span className="rl-chip">
        <span className="rl-chip-label">completed</span>
        <strong className="rl-chip-value">
          {formatRelativeTime(round.completed_at, now)}
        </strong>
      </span>
    ) : null
  } else if (activeStep === 'publishing') {
    chip = (
      <span className="rl-chip">
        <span className="rl-chip-dot" aria-hidden="true" />
        <span className="rl-chip-label">almost done</span>
      </span>
    )
  } else if (activeStep === 'verification' && frozenAt) {
    chip = (
      <span className="rl-chip">
        <span className="rl-chip-dot" aria-hidden="true" />
        <span className="rl-chip-label">inputs frozen</span>
        <strong className="rl-chip-value">
          {formatRelativeTime(frozenAt, now)}
        </strong>
      </span>
    )
  } else if (frozenAt || startedAt) {
    const anchorIso = (frozenAt ?? startedAt) as string
    chip = (
      <span className="rl-chip">
        <span className="rl-chip-dot" aria-hidden="true" />
        <span className="rl-chip-label">
          {frozenAt ? 'inputs frozen' : 'started'}
        </span>
        <strong className="rl-chip-value">
          {formatRelativeTime(anchorIso, now)}
        </strong>
      </span>
    )
  }

  return (
    <div
      className={`unl-scoring-round-lifecycle dashboard-panel${
        failed ? ' rl-failed' : ''
      }`}
    >
      <div className="rl-head">
        <div className="rl-head-main">
          <div className="rl-round">
            Round #{round.round_number} · {statusWord}
          </div>
          <h2 className="rl-headline">{headline}</h2>
        </div>
        {chip}
      </div>

      <StepMarkers currentKey={currentKey} failed={failed} />

      {failed ? (
        <div className="rl-note">
          {failedStep && FAILED_STEP_LEAD[failedStep] && (
            <>
              <span className="rl-fail-lead">
                {FAILED_STEP_LEAD[failedStep]}
              </span>{' '}
            </>
          )}
          The network is unaffected — the previously published validator list
          stays active until the next successful round.
          {round.error_message && (
            <details className="rl-detail">
              <summary>Technical detail</summary>
              <pre>{round.error_message}</pre>
            </details>
          )}
        </div>
      ) : (
        <p className="rl-note">{NOTE[activeStep]}</p>
      )}
    </div>
  )
}
