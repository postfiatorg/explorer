import { FC, useEffect, useRef, useState } from 'react'
import { useScoringConfig } from './useScoringConfig'

const MS = 1000

export type TimelinePhase = 'commit' | 'gap' | 'reveal' | 'closing' | 'sealed'

export interface TimelineModel {
  commitStartMs: number
  commitEndMs: number
  revealStartMs: number
  revealEndMs: number
  // Segment widths as fractions of the whole track; sum to 1. gapFrac is 0 when
  // the protocol opens the reveal window immediately after commit closes.
  commitFrac: number
  gapFrac: number
  revealFrac: number
  phase: TimelinePhase
  // Position of the leading-edge marker across the whole track, 0..1.
  trackProgress: number
  // Time left in the active window (or until the reveal opens during the gap);
  // 0 once the windows have closed.
  remainingMs: number
}

const clamp01 = (x: number): number => Math.min(1, Math.max(0, x))

// Resolve where a round sits in the commit -> gap -> reveal -> sealed lifecycle
// from the frozen-input anchor, the window durations, whether it finalized on
// chain, and a wall-clock instant. Returns null when the timeline cannot be drawn
// — no anchor, or window durations absent on deployments predating commit-reveal —
// so the caller hides it rather than rendering a broken track.
export const buildTimelineModel = (
  frozenAtIso: string | null | undefined,
  commitWindowSeconds: number | null | undefined,
  revealWindowSeconds: number | null | undefined,
  revealGapSeconds: number | null | undefined,
  finalized: boolean,
  nowMs: number,
): TimelineModel | null => {
  if (!frozenAtIso) return null
  const commitStartMs = Date.parse(frozenAtIso)
  if (Number.isNaN(commitStartMs)) return null
  if (!commitWindowSeconds || !revealWindowSeconds) return null
  if (commitWindowSeconds <= 0 || revealWindowSeconds <= 0) return null

  const gapSeconds =
    revealGapSeconds && revealGapSeconds > 0 ? revealGapSeconds : 0
  const commitEndMs = commitStartMs + commitWindowSeconds * MS
  const revealStartMs = commitEndMs + gapSeconds * MS
  const revealEndMs = revealStartMs + revealWindowSeconds * MS
  const total = revealEndMs - commitStartMs
  const commitFrac = (commitEndMs - commitStartMs) / total
  const gapFrac = (revealStartMs - commitEndMs) / total
  const revealFrac = (revealEndMs - revealStartMs) / total
  const trackProgress = clamp01((nowMs - commitStartMs) / total)
  const base = {
    commitStartMs,
    commitEndMs,
    revealStartMs,
    revealEndMs,
    commitFrac,
    gapFrac,
    revealFrac,
  }

  if (finalized) {
    return { ...base, phase: 'sealed', trackProgress: 1, remainingMs: 0 }
  }
  if (nowMs < commitEndMs) {
    return {
      ...base,
      phase: 'commit',
      trackProgress,
      remainingMs: commitEndMs - nowMs,
    }
  }
  if (nowMs < revealStartMs) {
    return {
      ...base,
      phase: 'gap',
      trackProgress,
      remainingMs: revealStartMs - nowMs,
    }
  }
  if (nowMs < revealEndMs) {
    return {
      ...base,
      phase: 'reveal',
      trackProgress,
      remainingMs: revealEndMs - nowMs,
    }
  }
  // Windows elapsed but the round has not been sealed on chain yet.
  return { ...base, phase: 'closing', trackProgress: 1, remainingMs: 0 }
}

const PHASE_NAME: Record<TimelinePhase, string> = {
  commit: 'Commit window',
  gap: 'Reveal window',
  reveal: 'Reveal window',
  closing: 'Windows closing',
  sealed: 'Windows closed',
}

// Countdown prefix for the live phases — the gap counts down to the reveal
// opening, the two windows count down to their own close.
const COUNTDOWN_PREFIX: Partial<Record<TimelinePhase, string>> = {
  commit: 'closes in',
  gap: 'opens in',
  reveal: 'closes in',
}

const isLivePhase = (phase: TimelinePhase): boolean =>
  phase === 'commit' || phase === 'gap' || phase === 'reveal'

// Progress through the currently active window, 0..1 — drives the active
// segment's fill. Distinct from trackProgress, which spans the whole track.
const activeFillFrac = (model: TimelineModel, nowMs: number): number => {
  if (model.phase === 'commit') {
    return clamp01(
      (nowMs - model.commitStartMs) / (model.commitEndMs - model.commitStartMs),
    )
  }
  if (model.phase === 'reveal') {
    return clamp01(
      (nowMs - model.revealStartMs) / (model.revealEndMs - model.revealStartMs),
    )
  }
  return model.phase === 'gap' ? 0 : 1
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

const formatCountdown = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / MS))
  return `${Math.floor(s / 60)}m ${pad2(s % 60)}s`
}

// Times render in the viewer's local timezone with no explicit label — the
// boundary times are minutes-apart window markers and the live countdown
// carries the urgency, so a timezone tag would only add noise.
const formatClock = (ms: number): string => {
  const d = new Date(ms)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

interface CommitRevealTimelineProps {
  frozenAt: string | null | undefined
  finalized: boolean
}

export const CommitRevealTimeline: FC<CommitRevealTimelineProps> = ({
  frozenAt,
  finalized,
}) => {
  const config = useScoringConfig()
  const commitWindowSeconds = config?.announcement_commit_window_seconds
  const revealWindowSeconds = config?.announcement_reveal_window_seconds
  const revealGapSeconds = config?.announcement_reveal_gap_seconds

  const model = buildTimelineModel(
    frozenAt,
    commitWindowSeconds,
    revealWindowSeconds,
    revealGapSeconds,
    finalized,
    Date.now(),
  )

  // State is only a re-render trigger for phase flips mid-run; the displayed
  // phase is read from `model` below, which stays fresh every render (including
  // when `finalized` flips true and the round seals).
  const [, bumpRender] = useState(0)

  const fillRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const countdownRef = useRef<HTMLSpanElement>(null)
  const phaseRef = useRef<TimelinePhase | null>(model?.phase ?? null)

  const live = model != null && isLivePhase(model.phase)

  // Advance the fill, marker, and countdown every frame straight to the DOM so the
  // motion glides in real time, decoupled from the panel's periodic data refetch.
  // React state only changes when the phase itself flips, which re-labels the head.
  useEffect(() => {
    if (!live) return undefined
    let raf = 0
    const tick = () => {
      const now = Date.now()
      const next = buildTimelineModel(
        frozenAt,
        commitWindowSeconds,
        revealWindowSeconds,
        revealGapSeconds,
        finalized,
        now,
      )
      if (next) {
        if (next.phase !== phaseRef.current) {
          phaseRef.current = next.phase
          bumpRender((n) => n + 1)
          // The refs still point at the outgoing segment until the re-render
          // reattaches them; skip this frame's writes and resume on the next.
          raf = requestAnimationFrame(tick)
          return
        }
        if (fillRef.current) {
          fillRef.current.style.width = `${activeFillFrac(next, now) * 100}%`
        }
        if (markerRef.current) {
          markerRef.current.style.left = `${next.trackProgress * 100}%`
        }
        if (countdownRef.current) {
          countdownRef.current.textContent = formatCountdown(next.remainingMs)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [
    live,
    frozenAt,
    commitWindowSeconds,
    revealWindowSeconds,
    revealGapSeconds,
    finalized,
  ])

  if (!model) return null

  const currentPhase = model.phase
  const commitActive = currentPhase === 'commit'
  const revealActive = currentPhase === 'reveal'
  const revealStarted =
    currentPhase === 'reveal' ||
    currentPhase === 'closing' ||
    currentPhase === 'sealed'
  const showMarker = isLivePhase(currentPhase)
  const showGapSegment = model.gapFrac > 0
  const initialFill = activeFillFrac(model, Date.now())

  const commitLabelMod = commitActive ? ' active' : ' done'
  let revealLabelMod = ''
  if (revealActive || currentPhase === 'gap') revealLabelMod = ' active'
  else if (revealStarted) revealLabelMod = ' done'

  return (
    <div className="crtl">
      <div className="crtl-head">
        <span className="crtl-phase">
          {isLivePhase(currentPhase) && (
            <span className="crtl-dot" aria-hidden="true" />
          )}
          <span
            className={`crtl-phase-name${isLivePhase(currentPhase) ? '' : ' done'}`}
          >
            {PHASE_NAME[currentPhase]}
          </span>
        </span>
        {isLivePhase(currentPhase) && (
          <span className="crtl-count">
            <span className="crtl-count-lbl">
              {COUNTDOWN_PREFIX[currentPhase]}
            </span>{' '}
            <span ref={countdownRef}>{formatCountdown(model.remainingMs)}</span>
          </span>
        )}
      </div>

      <div className="crtl-labels">
        <span
          className={`crtl-lab${commitLabelMod}`}
          style={{ flexGrow: model.commitFrac }}
        >
          Commit
        </span>
        {showGapSegment && (
          <span className="crtl-lab" style={{ flexGrow: model.gapFrac }} />
        )}
        <span
          className={`crtl-lab${revealLabelMod}`}
          style={{ flexGrow: model.revealFrac }}
        >
          Reveal
        </span>
      </div>

      <div className="crtl-track-wrap">
        <div
          className="crtl-track"
          role="img"
          aria-label={
            isLivePhase(currentPhase)
              ? `${PHASE_NAME[currentPhase]}, in progress`
              : PHASE_NAME[currentPhase]
          }
        >
          <div className="crtl-seg" style={{ flexGrow: model.commitFrac }}>
            <div
              className={`crtl-fill${commitActive ? ' active' : ' done'}`}
              ref={commitActive ? fillRef : undefined}
              style={{ width: commitActive ? `${initialFill * 100}%` : '100%' }}
            />
          </div>
          {showGapSegment && (
            <div
              className="crtl-seg crtl-gap"
              style={{ flexGrow: model.gapFrac }}
            />
          )}
          <div className="crtl-seg" style={{ flexGrow: model.revealFrac }}>
            {revealStarted && (
              <div
                className={`crtl-fill${revealActive ? ' active' : ' done'}`}
                ref={revealActive ? fillRef : undefined}
                style={{
                  width: revealActive ? `${initialFill * 100}%` : '100%',
                }}
              />
            )}
          </div>
          {!showGapSegment && (
            <div
              className="crtl-boundary"
              style={{ left: `${model.commitFrac * 100}%` }}
            />
          )}
        </div>
        {/* Marker lives outside the clipped track so its edge lines up exactly
            with the fill (one coordinate space) and its glow is not clipped. */}
        {showMarker && (
          <div
            className="crtl-now"
            ref={markerRef}
            style={{ left: `${model.trackProgress * 100}%` }}
          />
        )}
      </div>

      <div className="crtl-times">
        <span className="crtl-t0">{formatClock(model.commitStartMs)}</span>
        <span
          className="crtl-tmid"
          style={{ left: `${model.commitFrac * 100}%` }}
        >
          {formatClock(model.commitEndMs)}
        </span>
        <span className="crtl-t1">{formatClock(model.revealEndMs)}</span>
      </div>
    </div>
  )
}
