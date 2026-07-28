import { mount } from 'enzyme'
import { ScoringBanner } from './ScoringBanner'
import type {
  ScoringContext,
  ScoringHealth,
  ScoringRoundMeta,
} from '../Network/scoringUtils'

const round = (
  roundNumber: number,
  status = 'COMPLETE',
  extra: Partial<ScoringRoundMeta> = {},
): ScoringRoundMeta => ({
  round_number: roundNumber,
  status,
  completed_at: '2026-04-29T12:00:00Z',
  ...extra,
})

const contextFor = (scoringRound: ScoringRoundMeta): ScoringContext => ({
  activeRound: scoringRound,
  round: scoringRound,
  unl: {
    round_number: scoringRound.round_number,
    unl: [],
    alternates: [],
  },
  scores: {
    validator_scores: [],
  },
  config: {
    cadence_hours: 24,
    unl_score_cutoff: 40,
    unl_max_size: 35,
    unl_min_score_gap: 3,
  },
  roundConfig: null,
})

const healthWith = (nextDueAt?: string | null): ScoringHealth => ({
  scheduler: { healthy: true, detail: 'ok', next_due_at: nextDueAt },
  llm_endpoint: { healthy: true, detail: 'ok' },
  publisher_wallet: { healthy: true, detail: 'ok' },
})

describe('ScoringBanner next-round countdown', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    // 12 hours after the fixture round's completed_at.
    jest.setSystemTime(new Date('2026-04-30T00:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  const mountIdleBanner = (health: ScoringHealth | null) => {
    const completedRound = round(240)
    return mount(
      <ScoringBanner
        context={contextFor(completedRound)}
        latestAttempt={completedRound}
        health={health}
      />,
    )
  }

  const countdown = (wrapper: ReturnType<typeof mount>) =>
    wrapper.find('.banner-countdown')

  it('prefers the scheduler next_due_at over the completion-plus-cadence estimate', () => {
    const wrapper = mountIdleBanner(healthWith('2026-04-30T06:30:00Z'))

    expect(countdown(wrapper).text()).toBe('6h 30m')
    expect(countdown(wrapper).hasClass('banner-countdown-neutral')).toBe(true)

    wrapper.unmount()
  })

  it('falls back to completion plus cadence when the health payload lacks next_due_at', () => {
    const wrapper = mountIdleBanner(healthWith())

    expect(countdown(wrapper).text()).toBe('12h 0m')

    wrapper.unmount()
  })

  it('falls back to completion plus cadence when next_due_at is null', () => {
    const wrapper = mountIdleBanner(healthWith(null))

    expect(countdown(wrapper).text()).toBe('12h 0m')

    wrapper.unmount()
  })

  it('falls back to completion plus cadence when next_due_at is unparseable', () => {
    const wrapper = mountIdleBanner(healthWith('not-a-date'))

    expect(countdown(wrapper).text()).toBe('12h 0m')

    wrapper.unmount()
  })

  it('falls back to completion plus cadence when health is unavailable', () => {
    const wrapper = mountIdleBanner(null)

    expect(countdown(wrapper).text()).toBe('12h 0m')

    wrapper.unmount()
  })

  it('keeps a freshly overdue authoritative countdown neutral', () => {
    const wrapper = mountIdleBanner(healthWith('2026-04-29T23:00:00Z'))

    expect(countdown(wrapper).text()).toBe('due 1h ago')
    expect(countdown(wrapper).hasClass('banner-countdown-neutral')).toBe(true)

    wrapper.unmount()
  })

  it('shades the countdown amber once overdue passes the amber ratio of the cadence', () => {
    const wrapper = mountIdleBanner(healthWith('2026-04-29T18:00:00Z'))

    expect(countdown(wrapper).text()).toBe('due 6h ago')
    expect(countdown(wrapper).hasClass('banner-countdown-amber')).toBe(true)

    wrapper.unmount()
  })

  it('shades the countdown red once overdue passes the red ratio of the cadence', () => {
    const wrapper = mountIdleBanner(healthWith('2026-04-29T10:00:00Z'))

    expect(countdown(wrapper).text()).toBe('due 14h ago')
    expect(countdown(wrapper).hasClass('banner-countdown-red')).toBe(true)

    wrapper.unmount()
  })
})

describe('ScoringBanner memo warning', () => {
  it('renders memo-failed published rounds as warnings instead of running', () => {
    const memoFailedRound = round(240, 'VL_PUBLISHED_MEMO_FAILED', {
      error_message: 'ONCHAIN_PUBLISHED: tecNO_DST',
      memo_tx_hash: null,
    })
    const wrapper = mount(
      <ScoringBanner
        context={contextFor(memoFailedRound)}
        latestAttempt={memoFailedRound}
        health={null}
      />,
    )

    expect(wrapper.find('.unl-scoring-banner-memo-warning').exists()).toBe(true)
    expect(wrapper.text()).toContain('VL published, memo failed')
    expect(wrapper.text()).toContain(
      'Validators can still load the published VL',
    )
    expect(wrapper.text()).toContain('ONCHAIN_PUBLISHED: tecNO_DST')
    expect(wrapper.find('.unl-scoring-banner-running').exists()).toBe(false)

    wrapper.unmount()
  })

  it('warns when a newer memo-failed round is the latest attempt', () => {
    const lastScoredRound = round(239)
    const memoFailedAttempt = round(240, 'VL_PUBLISHED_MEMO_FAILED', {
      error_message: 'ONCHAIN_PUBLISHED: submit failed',
    })
    const wrapper = mount(
      <ScoringBanner
        context={contextFor(lastScoredRound)}
        latestAttempt={memoFailedAttempt}
        health={null}
      />,
    )

    expect(wrapper.find('.unl-scoring-banner-memo-warning').exists()).toBe(true)
    expect(wrapper.text()).toContain('Round #240 VL published, memo failed')
    expect(wrapper.text()).not.toContain('Round #240 running')

    wrapper.unmount()
  })
})

describe('ScoringBanner in-progress rounds', () => {
  it('labels a newer running attempt as running', () => {
    const wrapper = mount(
      <ScoringBanner
        context={contextFor(round(239))}
        latestAttempt={round(240, 'COLLECTING', { completed_at: null })}
        health={null}
      />,
    )

    expect(wrapper.text()).toContain('Round #240 running')

    wrapper.unmount()
  })

  it('labels a held attempt as verifying', () => {
    const wrapper = mount(
      <ScoringBanner
        context={contextFor(round(239))}
        latestAttempt={round(240, 'AWAITING_COMMIT_CLOSE', {
          completed_at: null,
          input_package_cid: 'QmInputPackage',
        })}
        health={null}
      />,
    )

    expect(wrapper.text()).toContain('Round #240 verifying')
    expect(wrapper.text()).not.toContain('Round #240 running')

    wrapper.unmount()
  })
})
