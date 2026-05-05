import { mount } from 'enzyme'
import { OverrideRoundTable, RankedTable } from './RankedTable'
import type {
  ScoresJson,
  ScoringContext,
  ScoringRoundMeta,
} from '../Network/scoringUtils'

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

const rankedMasterKey = 'nRanked1111111111111111111111111111111111111111'

const rankedScoreEntry = (score: number) => ({
  master_key: rankedMasterKey,
  score,
  consensus: score,
  reliability: score,
  software: score,
  diversity: score,
  identity: score,
  reasoning: 'Current scored validator',
})

const rankedContextFor = ({
  currentScore = 91,
  unl = [rankedMasterKey],
  alternates = [],
}: {
  currentScore?: number
  unl?: string[]
  alternates?: string[]
} = {}): ScoringContext => ({
  activeRound: round(202, 'custom'),
  round: round(201),
  unl: {
    round_number: 201,
    unl,
    alternates,
  },
  scores: {
    validator_scores: [rankedScoreEntry(currentScore)],
  },
  config: null,
  roundConfig: null,
})

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

describe('RankedTable deltas', () => {
  it('does not render NEW while prior scores are unresolved', () => {
    const wrapper = mount(
      <RankedTable
        context={rankedContextFor()}
        priorScores={undefined}
        priorUnl={undefined}
        snapshot={null}
        validatorMetaByKey={new Map()}
        expandedMasterKeys={new Set()}
        onToggleValidator={jest.fn()}
      />,
    )

    expect(wrapper.find('.delta-new').exists()).toBe(false)

    wrapper.unmount()
  })

  it('renders NEW when prior scores resolve without the validator', () => {
    const wrapper = mount(
      <RankedTable
        context={rankedContextFor()}
        priorScores={{ validator_scores: [] }}
        priorUnl={{ unl: [], alternates: [] }}
        snapshot={null}
        validatorMetaByKey={new Map()}
        expandedMasterKeys={new Set()}
        onToggleValidator={jest.fn()}
      />,
    )

    expect(wrapper.find('.delta-new').text()).toBe('new')

    wrapper.unmount()
  })

  it('renders promoted membership movement with score movement', () => {
    const wrapper = mount(
      <RankedTable
        context={rankedContextFor({ currentScore: 91 })}
        priorScores={{ validator_scores: [rankedScoreEntry(85)] }}
        priorUnl={{ unl: [], alternates: [rankedMasterKey] }}
        snapshot={null}
        validatorMetaByKey={new Map()}
        expandedMasterKeys={new Set()}
        onToggleValidator={jest.fn()}
      />,
    )

    expect(wrapper.find('.delta-promoted').text()).toBe('promoted')
    expect(wrapper.find('.delta-up').text()).toBe('↑6')

    wrapper.unmount()
  })

  it('renders displaced membership movement with score movement', () => {
    const wrapper = mount(
      <RankedTable
        context={rankedContextFor({
          currentScore: 82,
          unl: [],
          alternates: [rankedMasterKey],
        })}
        priorScores={{ validator_scores: [rankedScoreEntry(85)] }}
        priorUnl={{ unl: [rankedMasterKey], alternates: [] }}
        snapshot={null}
        validatorMetaByKey={new Map()}
        expandedMasterKeys={new Set()}
        onToggleValidator={jest.fn()}
      />,
    )

    expect(wrapper.find('.delta-displaced').text()).toBe('displaced')
    expect(wrapper.find('.delta-down').text()).toBe('↓3')

    wrapper.unmount()
  })

  it('renders score-only movement without membership movement', () => {
    const wrapper = mount(
      <RankedTable
        context={rankedContextFor({ currentScore: 91 })}
        priorScores={{ validator_scores: [rankedScoreEntry(85)] }}
        priorUnl={{ unl: [rankedMasterKey], alternates: [] }}
        snapshot={null}
        validatorMetaByKey={new Map()}
        expandedMasterKeys={new Set()}
        onToggleValidator={jest.fn()}
      />,
    )

    expect(wrapper.find('.delta-promoted').exists()).toBe(false)
    expect(wrapper.find('.delta-displaced').exists()).toBe(false)
    expect(wrapper.find('.delta-up').text()).toBe('↑6')

    wrapper.unmount()
  })

  it('renders no delta label when score and membership do not change', () => {
    const wrapper = mount(
      <RankedTable
        context={rankedContextFor({ currentScore: 91 })}
        priorScores={{ validator_scores: [rankedScoreEntry(91)] }}
        priorUnl={{ unl: [rankedMasterKey], alternates: [] }}
        snapshot={null}
        validatorMetaByKey={new Map()}
        expandedMasterKeys={new Set()}
        onToggleValidator={jest.fn()}
      />,
    )

    expect(wrapper.find('.delta').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('same')
    expect(wrapper.text()).not.toContain('unchanged')

    wrapper.unmount()
  })
})
