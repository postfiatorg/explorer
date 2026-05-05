import { mount } from 'enzyme'
import { RoundNavigation } from './RoundNavigation'
import type { ScoringRoundMeta } from '../Network/scoringUtils'

const completeRound = (
  roundNumber: number,
  overrideType: string | null = null,
): ScoringRoundMeta => ({
  round_number: roundNumber,
  status: 'COMPLETE',
  completed_at: '2026-04-29T12:00:00Z',
  override_type: overrideType,
})

const memoFailedRound = (roundNumber: number): ScoringRoundMeta => ({
  round_number: roundNumber,
  status: 'VL_PUBLISHED_MEMO_FAILED',
  completed_at: '2026-04-29T12:00:00Z',
})

describe('RoundNavigation', () => {
  it('labels completed override rounds distinctly', () => {
    const wrapper = mount(
      <RoundNavigation
        viewingRoundNumber={12}
        latestRoundNumber={12}
        recentRounds={[completeRound(12, 'custom'), completeRound(11)]}
        onSelectRound={jest.fn()}
      />,
    )

    expect(wrapper.find('.round-nav-meta').text()).toContain(
      'COMPLETE · custom override',
    )
    expect(wrapper.find('.round-nav-glyph').at(1).prop('title')).toContain(
      'override: custom',
    )
    expect(
      wrapper
        .find('.round-nav-glyph')
        .at(1)
        .hasClass('round-nav-glyph-override'),
    ).toBe(true)

    wrapper.unmount()
  })

  it('labels memo-failed VL rounds as published warnings', () => {
    const wrapper = mount(
      <RoundNavigation
        viewingRoundNumber={13}
        latestRoundNumber={13}
        recentRounds={[memoFailedRound(13), completeRound(12)]}
        onSelectRound={jest.fn()}
      />,
    )

    expect(wrapper.find('.round-nav-meta').text()).toContain(
      'VL published, memo failed',
    )
    expect(wrapper.find('.round-nav-meta').text()).not.toContain('RUNNING')
    expect(
      wrapper
        .find('.round-nav-meta-state')
        .hasClass('round-nav-meta-state-published-warning'),
    ).toBe(true)
    expect(wrapper.find('.round-nav-glyph').at(1).text()).toBe('!')
    expect(
      wrapper
        .find('.round-nav-glyph')
        .at(1)
        .hasClass('round-nav-glyph-published-warning'),
    ).toBe(true)
    expect(wrapper.find('.round-nav-glyph').at(1).prop('title')).toContain(
      'VL PUBLISHED · MEMO FAILED',
    )

    wrapper.unmount()
  })
})
