import { mount } from 'enzyme'
import { ValidatorDrillDown } from './ValidatorDrillDown'
import { useScoreHistory } from './useScoreHistory'
import type {
  ValidatorIdMap,
  ValidatorScoreEntry,
} from '../Network/scoringUtils'

jest.mock('./useScoreHistory')

const currentMasterKey = 'nHCurrent11111111111111111111111111111111111111'
const mappedMasterKey = 'nHBXSCTwVUbvZg5EAZsXXTtads2ZVd8UwLsuniGcLBgH9pP8EeBc'
const secondMappedMasterKey =
  'nHBg5iGpnvmbckhEUkY1oTnNqr8RbzRwKyW8x5NoGJYPVT4iS7um'
const seventeenthMappedMasterKey =
  'nHDUciGWrK9tmBBeq9wjSBiy1WhHXizH7nZDAF8MdbhRqQvwpeEL'
const twentyEighthMappedMasterKey =
  'nHUc7VSYA6xvFakSvuTojJQucBNukKwmtguUG2HMT9Xp9dKzkpvJ'

const scoreEntryFor = (reasoning: string): ValidatorScoreEntry => ({
  master_key: currentMasterKey,
  score: 88,
  consensus: 88,
  reliability: 88,
  software: 88,
  diversity: 88,
  identity: 88,
  reasoning,
})

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
    master_key: seventeenthMappedMasterKey,
    signing_key: 'n9SeventeenthSigningKey',
  },
  v028: {
    master_key: twentyEighthMappedMasterKey,
    signing_key: 'n9TwentyEighthSigningKey',
  },
}

const mountDrillDown = (
  scoreEntry: ValidatorScoreEntry,
  map: ValidatorIdMap | null = validatorIdMap,
) =>
  mount(
    <table>
      <tbody>
        <ValidatorDrillDown
          masterKey={currentMasterKey}
          currentRoundNumber={42}
          scoreEntry={scoreEntry}
          snapshotEntry={null}
          validatorIdMap={map}
          colspan={8}
        />
      </tbody>
    </table>,
  )

describe('ValidatorDrillDown reasoning validator ID mapping', () => {
  beforeEach(() => {
    ;(useScoreHistory as jest.Mock).mockReturnValue({ points: [] })
  })

  it('renders mapped validator IDs as clickable truncated validator links', () => {
    const wrapper = mountDrillDown(
      scoreEntryFor('Similar profile to v001, with lower diversity than v002.'),
    )

    const links = wrapper.find('.drill-down-reasoning-validator-link')
    expect(links).toHaveLength(2)
    expect(links.at(0).text()).toBe('nHBXSCTwVU...P8EeBc')
    expect(links.at(0).prop('href')).toBe(`/validators/${mappedMasterKey}`)
    expect(links.at(0).prop('target')).toBe('_blank')
    expect(links.at(1).text()).toBe('nHBg5iGpnv...4iS7um')
    expect(links.at(1).prop('href')).toBe(
      `/validators/${secondMappedMasterKey}`,
    )

    wrapper.unmount()
  })

  it('keeps original reasoning text when the mapping artifact is missing', () => {
    const wrapper = mountDrillDown(
      scoreEntryFor('Similar profile to v001.'),
      null,
    )

    expect(wrapper.find('.drill-down-reasoning-validator-link').exists()).toBe(
      false,
    )
    expect(wrapper.text()).toContain('Similar profile to v001.')

    wrapper.unmount()
  })

  it('keeps unmapped validator IDs unchanged', () => {
    const wrapper = mountDrillDown(scoreEntryFor('Similar profile to v003.'))

    expect(wrapper.find('.drill-down-reasoning-validator-link').exists()).toBe(
      false,
    )
    expect(wrapper.text()).toContain('Similar profile to v003.')

    wrapper.unmount()
  })

  it('only replaces exact validator ID tokens', () => {
    const wrapper = mountDrillDown(
      scoreEntryFor(
        'v001 is mapped; av001, v001a, and validator_v001 are not.',
      ),
    )

    const links = wrapper.find('.drill-down-reasoning-validator-link')
    expect(links).toHaveLength(1)
    expect(links.at(0).text()).toBe('nHBXSCTwVU...P8EeBc')
    expect(wrapper.text()).toContain('av001, v001a, and validator_v001')

    wrapper.unmount()
  })

  it('normalizes over-padded slash-separated validator IDs', () => {
    const wrapper = mountDrillDown(
      scoreEntryFor(
        'Identical profile to v001/v0017/v0028: excellent consensus.',
      ),
    )

    const links = wrapper.find('.drill-down-reasoning-validator-link')
    expect(links).toHaveLength(3)
    expect(links.at(0).prop('href')).toBe(`/validators/${mappedMasterKey}`)
    expect(links.at(1).prop('href')).toBe(
      `/validators/${seventeenthMappedMasterKey}`,
    )
    expect(links.at(2).prop('href')).toBe(
      `/validators/${twentyEighthMappedMasterKey}`,
    )
    expect(wrapper.text()).not.toContain('v0017')
    expect(wrapper.text()).not.toContain('v0028')

    wrapper.unmount()
  })

  it('does not mutate the raw score reasoning used by downloads', () => {
    const rawReasoning = 'Similar profile to v001.'
    const scoreEntry = scoreEntryFor(rawReasoning)
    const wrapper = mountDrillDown(scoreEntry)

    expect(wrapper.find('.drill-down-reasoning-validator-link')).toHaveLength(1)
    expect(scoreEntry.reasoning).toBe(rawReasoning)

    wrapper.unmount()
  })
})
