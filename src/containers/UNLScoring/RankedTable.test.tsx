import { mount } from 'enzyme'
import { OverrideRoundTable } from './RankedTable'
import type { ScoresJson, ScoringRoundMeta } from '../Network/scoringUtils'

const round = (
  roundNumber: number,
  overrideType: string | null = null,
): ScoringRoundMeta => ({
  round_number: roundNumber,
  status: 'COMPLETE',
  completed_at: '2026-04-29T12:00:00Z',
  override_type: overrideType,
})

const scores: ScoresJson = {
  validator_scores: [
    {
      master_key: 'nManual111111111111111111111111111111111111111',
      score: 97,
      consensus: 97,
      reliability: 97,
      software: 97,
      diversity: 97,
      identity: 97,
      reasoning: 'Manual validator with previous score',
    },
    {
      master_key: 'nOther2222222222222222222222222222222222222222',
      score: 88,
      consensus: 88,
      reliability: 88,
      software: 88,
      diversity: 88,
      identity: 88,
      reasoning: 'Previously scored validator',
    },
  ],
}

describe('OverrideRoundTable', () => {
  it('renders manual override rounds without numeric score cells', () => {
    const wrapper = mount(
      <OverrideRoundTable
        round={round(202, 'custom')}
        unl={{
          unl: ['nManual111111111111111111111111111111111111111'],
          alternates: [],
        }}
        latestScoredRound={round(201)}
        latestScoredScores={scores}
        validatorMetaByKey={new Map()}
      />,
    )

    expect(wrapper.text()).toContain('manually selected validators')
    expect(wrapper.text()).toContain('not selected in manual override')
    expect(wrapper.text()).toContain('Latest scored round: #201.')
    expect(wrapper.find('.ranked-overall-value').exists()).toBe(false)
    expect(wrapper.find('.ranked-override-pill-manual').text()).toBe('manual')
    expect(wrapper.find('.ranked-override-pill').at(1).text()).toBe(
      'not selected',
    )
    expect(wrapper.text()).not.toContain('97')
    expect(wrapper.text()).not.toContain('88')

    wrapper.unmount()
  })
})
