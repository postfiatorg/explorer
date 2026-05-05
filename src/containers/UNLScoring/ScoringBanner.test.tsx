import { mount } from 'enzyme'
import { ScoringBanner } from './ScoringBanner'
import type { ScoringContext, ScoringRoundMeta } from '../Network/scoringUtils'

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
