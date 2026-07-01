import { mount } from 'enzyme'
import {
  CommitRevealTimeline,
  buildTimelineModel,
} from './CommitRevealTimeline'
import { useScoringConfig } from './useScoringConfig'
import { ScoringConfig } from '../Network/scoringUtils'

jest.mock('./useScoringConfig')
const mockedUseScoringConfig = useScoringConfig as jest.MockedFunction<
  typeof useScoringConfig
>

const FROZEN = '2026-07-01T14:22:00Z'
const COMMIT_START = Date.parse(FROZEN)
const AT = (iso: string) => Date.parse(iso)

// 15-minute commit window (14:22 -> 14:37) then a 15-minute reveal (14:37 ->
// 14:52) with no gap — the devnet configuration.
const cfg = (withWindows: boolean): ScoringConfig => ({
  cadence_hours: 24,
  unl_score_cutoff: 0.5,
  unl_max_size: 35,
  unl_min_score_gap: 0.05,
  ...(withWindows
    ? {
        announcement_commit_window_seconds: 900,
        announcement_reveal_window_seconds: 900,
        announcement_reveal_gap_seconds: 0,
      }
    : {}),
})

describe('buildTimelineModel', () => {
  it('returns null without a frozen-input anchor', () => {
    expect(
      buildTimelineModel(null, 900, 900, 0, false, COMMIT_START),
    ).toBeNull()
    expect(
      buildTimelineModel('not-a-date', 900, 900, 0, false, COMMIT_START),
    ).toBeNull()
  })

  it('returns null when the window durations are missing or non-positive', () => {
    expect(
      buildTimelineModel(FROZEN, undefined, 900, 0, false, COMMIT_START),
    ).toBeNull()
    expect(
      buildTimelineModel(FROZEN, 900, 0, 0, false, COMMIT_START),
    ).toBeNull()
  })

  it('derives the commit phase while now is inside the commit window', () => {
    const m = buildTimelineModel(
      FROZEN,
      900,
      900,
      0,
      false,
      AT('2026-07-01T14:30:00Z'),
    )
    expect(m?.phase).toBe('commit')
    // 8m into a 15m commit window, and commit is half of the 30m total track.
    expect(m?.commitFrac).toBeCloseTo(0.5)
    expect(m?.trackProgress).toBeCloseTo(8 / 30)
    expect(m?.remainingMs).toBe(7 * 60 * 1000)
  })

  it('derives the reveal phase while now is inside the reveal window', () => {
    const m = buildTimelineModel(
      FROZEN,
      900,
      900,
      0,
      false,
      AT('2026-07-01T14:45:00Z'),
    )
    expect(m?.phase).toBe('reveal')
    expect(m?.trackProgress).toBeCloseTo(23 / 30)
    expect(m?.remainingMs).toBe(7 * 60 * 1000)
  })

  it('reports the gap phase between the commit and reveal windows', () => {
    // commit 14:22-14:37, 120s gap so reveal opens 14:39; 14:38 sits in the gap.
    const m = buildTimelineModel(
      FROZEN,
      900,
      900,
      120,
      false,
      AT('2026-07-01T14:38:00Z'),
    )
    expect(m?.phase).toBe('gap')
    expect(m?.gapFrac).toBeGreaterThan(0)
    expect(m?.remainingMs).toBe(60 * 1000)
  })

  it('reports the sealed phase for a finalized round regardless of clock', () => {
    const m = buildTimelineModel(
      FROZEN,
      900,
      900,
      0,
      true,
      AT('2026-07-01T14:30:00Z'),
    )
    expect(m?.phase).toBe('sealed')
    expect(m?.trackProgress).toBe(1)
    expect(m?.remainingMs).toBe(0)
  })

  it('reports the closing phase once both windows elapse before sealing', () => {
    const m = buildTimelineModel(
      FROZEN,
      900,
      900,
      0,
      false,
      AT('2026-07-01T15:10:00Z'),
    )
    expect(m?.phase).toBe('closing')
    expect(m?.trackProgress).toBe(1)
  })

  it('sizes the commit segment proportionally to its share of the total', () => {
    // 600s commit + 1800s reveal -> commit is a quarter of the track.
    const m = buildTimelineModel(FROZEN, 600, 1800, 0, false, COMMIT_START)
    expect(m?.commitFrac).toBeCloseTo(0.25)
    expect(m?.gapFrac).toBe(0)
  })
})

describe('CommitRevealTimeline', () => {
  let nowSpy: jest.SpyInstance

  beforeEach(() => {
    global.requestAnimationFrame = jest.fn().mockReturnValue(0) as never
    global.cancelAnimationFrame = jest.fn() as never
    nowSpy = jest.spyOn(Date, 'now')
  })

  afterEach(() => {
    nowSpy.mockRestore()
    jest.clearAllMocks()
  })

  it('renders nothing when the config lacks the window durations', () => {
    mockedUseScoringConfig.mockReturnValue(cfg(false))
    nowSpy.mockReturnValue(AT('2026-07-01T14:30:00Z'))
    const wrapper = mount(
      <CommitRevealTimeline
        frozenAt={FROZEN}
        finalized={false}
        sealedAt={null}
      />,
    )
    expect(wrapper.isEmptyRender()).toBe(true)
    wrapper.unmount()
  })

  it('renders nothing without a frozen-input anchor', () => {
    mockedUseScoringConfig.mockReturnValue(cfg(true))
    nowSpy.mockReturnValue(AT('2026-07-01T14:30:00Z'))
    const wrapper = mount(
      <CommitRevealTimeline
        frozenAt={null}
        finalized={false}
        sealedAt={null}
      />,
    )
    expect(wrapper.isEmptyRender()).toBe(true)
    wrapper.unmount()
  })

  it('shows the commit window with both labels and a live marker', () => {
    mockedUseScoringConfig.mockReturnValue(cfg(true))
    nowSpy.mockReturnValue(AT('2026-07-01T14:30:00Z'))
    const wrapper = mount(
      <CommitRevealTimeline
        frozenAt={FROZEN}
        finalized={false}
        sealedAt={null}
      />,
    )
    expect(wrapper.find('.crtl-phase-name').text()).toBe('Commit window')
    expect(wrapper.text()).toContain('Commit')
    expect(wrapper.text()).toContain('Reveal')
    // Both labels always render in full — never clipped by the fill.
    expect(wrapper.find('.crtl-lab')).toHaveLength(2)
    expect(wrapper.find('.crtl-now').exists()).toBe(true)
    wrapper.unmount()
  })

  it('switches the head to the reveal window inside the reveal phase', () => {
    mockedUseScoringConfig.mockReturnValue(cfg(true))
    nowSpy.mockReturnValue(AT('2026-07-01T14:45:00Z'))
    const wrapper = mount(
      <CommitRevealTimeline
        frozenAt={FROZEN}
        finalized={false}
        sealedAt={null}
      />,
    )
    expect(wrapper.find('.crtl-phase-name').text()).toBe('Reveal window')
    expect(wrapper.find('.crtl-now').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders a static sealed state with no live marker once finalized', () => {
    mockedUseScoringConfig.mockReturnValue(cfg(true))
    nowSpy.mockReturnValue(AT('2026-07-01T15:00:00Z'))
    const wrapper = mount(
      <CommitRevealTimeline
        frozenAt={FROZEN}
        finalized
        sealedAt="2026-07-01T14:52:00Z"
      />,
    )
    expect(wrapper.find('.crtl-phase-name').text()).toBe('Windows closed')
    expect(wrapper.find('.crtl-now').exists()).toBe(false)
    wrapper.unmount()
  })

  it('advances to the sealed state when the round finalizes while mounted', () => {
    mockedUseScoringConfig.mockReturnValue(cfg(true))
    nowSpy.mockReturnValue(AT('2026-07-01T14:45:00Z')) // inside the reveal window
    const wrapper = mount(
      <CommitRevealTimeline
        frozenAt={FROZEN}
        finalized={false}
        sealedAt={null}
      />,
    )
    expect(wrapper.find('.crtl-phase-name').text()).toBe('Reveal window')

    // The convergence view flips finalized -> true on its next poll while this
    // component stays mounted; the head must follow to the sealed state.
    wrapper.setProps({ finalized: true, sealedAt: '2026-07-01T14:45:30Z' })
    wrapper.update()
    expect(wrapper.find('.crtl-phase-name').text()).toBe('Windows closed')
    expect(wrapper.find('.crtl-now').exists()).toBe(false)
    wrapper.unmount()
  })
})
