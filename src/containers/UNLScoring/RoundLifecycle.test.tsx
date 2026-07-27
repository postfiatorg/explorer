import { mount } from 'enzyme'
import { act } from 'react-dom/test-utils'
import {
  RoundLifecycle,
  formatUnlockCountdown,
  resolveFailedStep,
  resolveLifecycleStep,
} from './RoundLifecycle'
import { useScoringConfig } from './useScoringConfig'
import { ScoringConfig, ScoringRoundMeta } from '../Network/scoringUtils'

jest.mock('./useScoringConfig')
const mockedUseScoringConfig = useScoringConfig as jest.MockedFunction<
  typeof useScoringConfig
>

const FROZEN = '2026-04-29T12:00:00Z'

// 15-minute commit window then a 5-minute reveal with no gap — the devnet
// configuration, so results unlock 20 minutes after the input freeze.
const config = (withWindows: boolean): ScoringConfig => ({
  cadence_hours: 24,
  unl_score_cutoff: 40,
  unl_max_size: 35,
  unl_min_score_gap: 5,
  ...(withWindows
    ? {
        announcement_commit_window_seconds: 900,
        announcement_reveal_window_seconds: 300,
        announcement_reveal_gap_seconds: 0,
      }
    : {}),
})

const round = (overrides: Partial<ScoringRoundMeta>): ScoringRoundMeta => ({
  round_number: 320,
  status: 'COLLECTING',
  created_at: '2026-04-29T11:59:00Z',
  started_at: '2026-04-29T11:59:30Z',
  completed_at: null,
  ...overrides,
})

const stepState = (
  wrapper: ReturnType<typeof mount>,
  label: string,
): string => {
  const step = wrapper
    .find('li.rl-step')
    .filterWhere((node) => node.text().includes(label))
    .first()
  const className = step.prop('className') as string
  return className.replace('rl-step ', '')
}

describe('resolveLifecycleStep', () => {
  it.each([
    ['COLLECTING', 'evidence'],
    ['INPUT_FROZEN', 'scoring'],
    ['SCORED', 'scoring'],
    ['SELECTED', 'scoring'],
    ['VL_SIGNED', 'scoring'],
    ['AWAITING_COMMIT_CLOSE', 'verification'],
    ['IPFS_PUBLISHED', 'publishing'],
    ['VL_DISTRIBUTED', 'publishing'],
    ['ONCHAIN_PUBLISHED', 'publishing'],
    // Terminal: the VL is published, only the on-chain memo is missing.
    ['VL_PUBLISHED_MEMO_FAILED', 'complete'],
    ['COMPLETE', 'complete'],
  ])('maps %s onto the %s step', (status, expected) => {
    expect(resolveLifecycleStep(round({ status }))).toBe(expected)
  })

  it('falls back by artifact presence for an unrecognized status', () => {
    expect(resolveLifecycleStep(round({ status: 'FUTURE_STAGE' }))).toBe(
      'evidence',
    )
    expect(
      resolveLifecycleStep(
        round({ status: 'FUTURE_STAGE', input_package_cid: 'Qm-input' }),
      ),
    ).toBe('scoring')
  })
})

describe('resolveFailedStep', () => {
  const failedAfter = (fields: Partial<ScoringRoundMeta>): ScoringRoundMeta =>
    round({ status: 'FAILED', ...fields })

  it('stops at the step the round died on', () => {
    expect(resolveFailedStep(failedAfter({ snapshot_hash: null }))).toBe(
      'evidence',
    )
    expect(
      resolveFailedStep(failedAfter({ snapshot_hash: 'h', scores_hash: null })),
    ).toBe('scoring')
    // Scored but never selected or signed.
    expect(
      resolveFailedStep(
        failedAfter({
          snapshot_hash: 'h',
          scores_hash: 'h',
          vl_sequence: null,
        }),
      ),
    ).toBe('scoring')
    expect(
      resolveFailedStep(
        failedAfter({
          snapshot_hash: 'h',
          scores_hash: 'h',
          vl_sequence: 4,
          final_bundle_cid: null,
        }),
      ),
    ).toBe('publishing')
    // Distribution and on-chain anchoring both fail within publishing.
    expect(
      resolveFailedStep(
        failedAfter({
          snapshot_hash: 'h',
          scores_hash: 'h',
          vl_sequence: 4,
          final_bundle_cid: 'Qm-bundle',
          github_pages_commit_url: null,
        }),
      ),
    ).toBe('publishing')
    expect(
      resolveFailedStep(
        failedAfter({
          snapshot_hash: 'h',
          scores_hash: 'h',
          vl_sequence: 4,
          final_bundle_cid: 'Qm-bundle',
          github_pages_commit_url: 'https://github.com/commit',
          memo_tx_hash: null,
        }),
      ),
    ).toBe('publishing')
  })
})

describe('formatUnlockCountdown', () => {
  const NOW = Date.parse('2026-04-29T12:08:47Z')

  it('counts down to the reveal window closing', () => {
    expect(formatUnlockCountdown(FROZEN, 900, 300, 0, NOW)).toBe('11m 13s')
  })

  it('includes an hours segment on long windows', () => {
    expect(formatUnlockCountdown(FROZEN, 3600, 3600, 0, NOW)).toBe('1h 51m 13s')
  })

  it('counts the reveal gap toward the unlock instant', () => {
    expect(formatUnlockCountdown(FROZEN, 900, 300, 120, NOW)).toBe('13m 13s')
  })

  it('returns null once the windows have elapsed', () => {
    expect(
      formatUnlockCountdown(
        FROZEN,
        900,
        300,
        0,
        Date.parse('2026-04-29T12:20:00Z'),
      ),
    ).toBeNull()
  })

  it('returns null without an anchor or window lengths', () => {
    expect(formatUnlockCountdown(null, 900, 300, 0, NOW)).toBeNull()
    expect(formatUnlockCountdown('not-a-date', 900, 300, 0, NOW)).toBeNull()
    expect(formatUnlockCountdown(FROZEN, undefined, 300, 0, NOW)).toBeNull()
    expect(formatUnlockCountdown(FROZEN, 900, undefined, 0, NOW)).toBeNull()
  })
})

describe('RoundLifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-29T12:08:47Z'))
    mockedUseScoringConfig.mockReturnValue(config(true))
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('marks completed, active, and pending steps during verification', () => {
    const wrapper = mount(
      <RoundLifecycle
        round={round({
          status: 'AWAITING_COMMIT_CLOSE',
          input_frozen_at: FROZEN,
        })}
      />,
    )

    expect(stepState(wrapper, 'Evidence')).toBe('rl-step-done')
    expect(stepState(wrapper, 'Scoring')).toBe('rl-step-done')
    expect(stepState(wrapper, 'Verification')).toBe('rl-step-active')
    expect(stepState(wrapper, 'Publishing')).toBe('rl-step-pending')
    expect(stepState(wrapper, 'Complete')).toBe('rl-step-pending')

    expect(wrapper.text()).toContain('Validators are verifying this round')
    expect(wrapper.text()).toContain('Round #320 · in progress')
    expect(wrapper.text()).toContain('Scores stay sealed')
    // No internal pipeline vocabulary reaches the reader.
    expect(wrapper.text()).not.toContain('AWAITING_COMMIT_CLOSE')

    wrapper.unmount()
  })

  it('shows the unlock countdown and ticks it down once per second', () => {
    const wrapper = mount(
      <RoundLifecycle
        round={round({
          status: 'AWAITING_COMMIT_CLOSE',
          input_frozen_at: FROZEN,
        })}
      />,
    )

    expect(wrapper.text()).toContain('results unlock in')
    expect(wrapper.text()).toContain('11m 13s')

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    wrapper.update()

    expect(wrapper.text()).toContain('11m 12s')

    wrapper.unmount()
  })

  it('hides the countdown when the deployment serves no commit-reveal windows', () => {
    mockedUseScoringConfig.mockReturnValue(config(false))

    const wrapper = mount(
      <RoundLifecycle
        round={round({
          status: 'AWAITING_COMMIT_CLOSE',
          input_frozen_at: FROZEN,
        })}
      />,
    )

    expect(wrapper.text()).not.toContain('results unlock in')
    expect(wrapper.text()).toContain('inputs frozen')

    wrapper.unmount()
  })

  it('renders the collecting phase with no completed step', () => {
    const wrapper = mount(<RoundLifecycle round={round({})} />)

    expect(stepState(wrapper, 'Evidence')).toBe('rl-step-active')
    expect(stepState(wrapper, 'Scoring')).toBe('rl-step-pending')
    expect(wrapper.text()).toContain('Gathering validator evidence')
    expect(wrapper.text()).not.toContain('COLLECTING')

    wrapper.unmount()
  })

  it('separates publishing from verification once outputs exist', () => {
    const wrapper = mount(
      <RoundLifecycle
        round={round({
          status: 'IPFS_PUBLISHED',
          input_frozen_at: FROZEN,
          final_bundle_cid: 'Qm-bundle',
        })}
      />,
    )

    expect(stepState(wrapper, 'Verification')).toBe('rl-step-done')
    expect(stepState(wrapper, 'Publishing')).toBe('rl-step-active')
    expect(wrapper.text()).toContain('Verification closed — publishing results')

    wrapper.unmount()
  })

  it('renders a completed round with every step done', () => {
    const wrapper = mount(
      <RoundLifecycle
        round={round({
          status: 'COMPLETE',
          completed_at: '2026-04-29T12:08:40Z',
        })}
      />,
    )

    expect(stepState(wrapper, 'Complete')).toBe('rl-step-done')
    expect(stepState(wrapper, 'Evidence')).toBe('rl-step-done')
    expect(wrapper.text()).toContain('Round complete')
    expect(wrapper.text()).toContain('completed')
    expect(wrapper.text()).toContain('7s ago')

    wrapper.unmount()
  })

  it('renders a failed round as the progression stopped at its step', () => {
    const wrapper = mount(
      <RoundLifecycle
        round={round({
          status: 'FAILED',
          snapshot_hash: 'snapshot-hash',
          scores_hash: null,
          completed_at: '2026-04-29T12:08:37Z',
          error_message: 'modal-http: internal error',
        })}
        failed
      />,
    )

    expect(wrapper.find('.rl-failed').exists()).toBe(true)
    expect(stepState(wrapper, 'Evidence')).toBe('rl-step-done')
    expect(stepState(wrapper, 'Scoring')).toBe('rl-step-failed')
    expect(stepState(wrapper, 'Verification')).toBe('rl-step-pending')

    expect(wrapper.text()).toContain('Round failed during scoring')
    expect(wrapper.text()).toContain('29 Apr 2026')
    expect(wrapper.text()).toContain('No scores were produced.')
    expect(wrapper.text()).toContain('The network is unaffected')
    expect(wrapper.text()).toContain('Technical detail')
    expect(wrapper.find('details.rl-detail pre').text()).toBe(
      'modal-http: internal error',
    )
    expect(wrapper.text()).not.toContain('results unlock in')

    wrapper.unmount()
  })

  it('omits the technical disclosure when the round carries no error message', () => {
    const wrapper = mount(
      <RoundLifecycle
        round={round({ status: 'FAILED', snapshot_hash: null })}
        failed
      />,
    )

    expect(wrapper.text()).toContain('Round failed while gathering evidence')
    expect(wrapper.find('details.rl-detail').exists()).toBe(false)

    wrapper.unmount()
  })
})
