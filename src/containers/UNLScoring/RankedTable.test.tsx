import { mount } from 'enzyme'
import { OverrideRoundTable, RankedTable } from './RankedTable'
import type {
  ScoresJson,
  ScoringContext,
  ScoringRoundMeta,
  ValidatorIdMap,
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
const mappedMasterKey = 'nHBXSCTwVUbvZg5EAZsXXTtads2ZVd8UwLsuniGcLBgH9pP8EeBc'
const secondMappedMasterKey =
  'nHBg5iGpnvmbckhEUkY1oTnNqr8RbzRwKyW8x5NoGJYPVT4iS7um'
const thirdMappedMasterKey =
  'nHDUciGWrK9tmBBeq9wjSBiy1WhHXizH7nZDAF8MdbhRqQvwpeEL'
const fourthMappedMasterKey =
  'nHUc7VSYA6xvFakSvuTojJQucBNukKwmtguUG2HMT9Xp9dKzkpvJ'

const validatorIdMap: ValidatorIdMap = {
  v001: {
    master_key: mappedMasterKey,
    signing_key: 'n9MappedSigningKey',
  },
  v002: {
    master_key: secondMappedMasterKey,
    signing_key: 'n9SecondSigningKey',
  },
  v017: {
    master_key: thirdMappedMasterKey,
    signing_key: 'n9ThirdSigningKey',
  },
  v028: {
    master_key: fourthMappedMasterKey,
    signing_key: 'n9FourthSigningKey',
  },
}

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
  networkSummary,
}: {
  currentScore?: number
  unl?: string[]
  alternates?: string[]
  networkSummary?: string
} = {}): ScoringContext => ({
  activeRound: round(202, 'custom'),
  round: round(201),
  unl: {
    round_number: 201,
    unl,
    alternates,
  },
  scores: {
    ...(networkSummary === undefined
      ? {}
      : { network_summary: networkSummary }),
    validator_scores: [rankedScoreEntry(currentScore)],
  },
  config: null,
  roundConfig: null,
})

const mountRankedTable = (
  context: ScoringContext,
  map: ValidatorIdMap | null = null,
) =>
  mount(
    <RankedTable
      context={context}
      priorScores={undefined}
      priorUnl={undefined}
      snapshot={null}
      validatorIdMap={map}
      validatorMetaByKey={new Map()}
      expandedMasterKeys={new Set()}
      onToggleValidator={jest.fn()}
    />,
  )

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

describe('RankedTable round reasoning', () => {
  it('renders round reasoning before ranked validators when a network summary is present', () => {
    const wrapper = mountRankedTable(
      rankedContextFor({
        networkSummary:
          'Network concentration is low and high-agreement validators lead the round.',
      }),
    )

    const reasoning = wrapper.find('.round-reasoning')
    expect(reasoning.exists()).toBe(true)
    expect(reasoning.find('.round-reasoning-title').text()).toBe(
      'Round reasoning',
    )
    expect(reasoning.text()).toContain('Network concentration is low')

    const pageText = wrapper.text()
    expect(pageText.indexOf('Round reasoning')).toBeLessThan(
      pageText.indexOf('Ranked validators'),
    )

    wrapper.unmount()
  })

  it('omits round reasoning when the network summary is absent', () => {
    const wrapper = mountRankedTable(rankedContextFor())

    expect(wrapper.find('.round-reasoning').exists()).toBe(false)

    wrapper.unmount()
  })

  it('omits round reasoning when the network summary is blank', () => {
    const wrapper = mountRankedTable(
      rankedContextFor({ networkSummary: '   ' }),
    )

    expect(wrapper.find('.round-reasoning').exists()).toBe(false)

    wrapper.unmount()
  })

  it('maps anonymous validator IDs in round reasoning with exact-token boundaries', () => {
    const wrapper = mountRankedTable(
      rankedContextFor({
        networkSummary:
          'v001, and v002 are close calls; v0012 and validator_v001 stay literal.',
      }),
      validatorIdMap,
    )

    const links = wrapper.find(
      '.round-reasoning .drill-down-reasoning-validator-link',
    )
    expect(links).toHaveLength(2)
    expect(links.at(0).text()).toBe('nHBXS...')
    expect(links.at(0).prop('href')).toBe(`/validators/${mappedMasterKey}`)
    expect(links.at(0).prop('target')).toBe('_blank')
    expect(links.at(0).prop('title')).toBe(mappedMasterKey)
    expect(links.at(1).text()).toBe('nHBg5...')
    expect(links.at(1).prop('href')).toBe(
      `/validators/${secondMappedMasterKey}`,
    )
    expect(wrapper.find('.round-reasoning').text()).toContain(
      'v0012 and validator_v001 stay literal.',
    )

    wrapper.unmount()
  })

  it('collapses and expands contiguous validator references', () => {
    const wrapper = mountRankedTable(
      rankedContextFor({
        networkSummary:
          'Critical failures affected v001, v002, v017, and v028 during the round.',
      }),
      validatorIdMap,
    )

    let links = wrapper.find(
      '.round-reasoning .drill-down-reasoning-validator-link',
    )
    expect(links).toHaveLength(2)
    expect(links.at(0).prop('href')).toBe(`/validators/${mappedMasterKey}`)
    expect(links.at(1).prop('href')).toBe(
      `/validators/${secondMappedMasterKey}`,
    )

    const moreButton = wrapper.find(
      '.round-reasoning .drill-down-reasoning-validator-more',
    )
    expect(wrapper.find('.round-reasoning').text()).toContain(
      'nHBXS..., nHBg5... and 2 more validators',
    )
    expect(moreButton.text()).toBe('2 more validators')
    expect(moreButton.prop('aria-expanded')).toBe(false)

    moreButton.simulate('click')
    wrapper.update()

    links = wrapper.find(
      '.round-reasoning .drill-down-reasoning-validator-link',
    )
    expect(links).toHaveLength(4)
    expect(links.at(2).prop('href')).toBe(`/validators/${thirdMappedMasterKey}`)
    expect(links.at(3).prop('href')).toBe(
      `/validators/${fourthMappedMasterKey}`,
    )
    expect(wrapper.find('.round-reasoning').text()).toContain(
      'nHBXS..., nHBg5..., nHDUc..., and nHUc7...',
    )
    expect(
      wrapper
        .find('.round-reasoning .drill-down-reasoning-validator-more')
        .exists(),
    ).toBe(false)

    wrapper.unmount()
  })

  it('does not collapse validator references across sentence boundaries', () => {
    const wrapper = mountRankedTable(
      rankedContextFor({
        networkSummary:
          'v001 passed consensus checks. v002 improved identity. v017 improved diversity.',
      }),
      validatorIdMap,
    )

    expect(
      wrapper.find('.round-reasoning .drill-down-reasoning-validator-link'),
    ).toHaveLength(3)
    expect(
      wrapper
        .find('.round-reasoning .drill-down-reasoning-validator-more')
        .exists(),
    ).toBe(false)

    wrapper.unmount()
  })

  it('does not mutate the raw network summary value', () => {
    const rawSummary = 'Similar profile to v001.'
    const context = rankedContextFor({ networkSummary: rawSummary })
    const wrapper = mountRankedTable(context, validatorIdMap)

    expect(
      wrapper.find('.round-reasoning .drill-down-reasoning-validator-link'),
    ).toHaveLength(1)
    expect(context.scores.network_summary).toBe(rawSummary)

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
