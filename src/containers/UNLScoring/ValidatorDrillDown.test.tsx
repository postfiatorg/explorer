import { mount } from 'enzyme'
import { ValidatorDrillDown } from './ValidatorDrillDown'
import { useScoreHistory } from './useScoreHistory'
import type {
  SnapshotValidator,
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

const snapshotEntryFor = (
  asn: SnapshotValidator['asn'],
): SnapshotValidator => ({
  master_key: currentMasterKey,
  domain: null,
  domain_verified: false,
  asn,
  geolocation: null,
  agreement_1h: null,
  agreement_24h: null,
  agreement_30d: null,
  server_version: null,
  unl: false,
  base_fee: null,
  identity: null,
  signing_key: null,
  ip: '192.0.2.1',
})

const mountDrillDown = (
  scoreEntry: ValidatorScoreEntry,
  map: ValidatorIdMap | null = validatorIdMap,
  snapshotEntry: SnapshotValidator | null = null,
) =>
  mount(
    <table>
      <tbody>
        <ValidatorDrillDown
          masterKey={currentMasterKey}
          currentRoundNumber={42}
          scoreEntry={scoreEntry}
          snapshotEntry={snapshotEntry}
          validatorIdMap={map}
          colspan={8}
        />
      </tbody>
    </table>,
  )

const networkProviderText = (wrapper: ReturnType<typeof mount>): string =>
  wrapper
    .find('.drill-down-field')
    .filterWhere(
      (node) => node.find('.drill-down-label').text() === 'Network provider',
    )
    .first()
    .find('.drill-down-value')
    .text()

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
    expect(links.at(0).text()).toBe('nHBXS...')
    expect(links.at(0).prop('href')).toBe(`/validators/${mappedMasterKey}`)
    expect(links.at(0).prop('target')).toBe('_blank')
    expect(links.at(0).prop('title')).toBe(mappedMasterKey)
    expect(links.at(1).text()).toBe('nHBg5...')
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
    expect(links.at(0).text()).toBe('nHBXS...')
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
    expect(links.at(2).text()).toBe('nHUc7...')
    expect(links.at(2).prop('href')).toBe(
      `/validators/${twentyEighthMappedMasterKey}`,
    )
    expect(wrapper.find('.drill-down-reasoning-validator-more').exists()).toBe(
      false,
    )
    expect(wrapper.find('.drill-down-reasoning-text').text()).toContain(
      'nHBXS..., nHDUc..., and nHUc7...',
    )
    expect(wrapper.text()).not.toContain('v0017')
    expect(wrapper.text()).not.toContain('v0028')

    wrapper.unmount()
  })

  it('keeps separated validator references inline', () => {
    const wrapper = mountDrillDown(
      scoreEntryFor('v001 is strong. v002 is stable. v017 improves diversity.'),
    )

    expect(wrapper.find('.drill-down-reasoning-validator-link')).toHaveLength(3)
    expect(wrapper.find('.drill-down-reasoning-validator-more').exists()).toBe(
      false,
    )

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

describe('ValidatorDrillDown network provider display', () => {
  beforeEach(() => {
    ;(useScoreHistory as jest.Mock).mockReturnValue({ points: [] })
  })

  it('uses exact ASN display names before registry-name matching', () => {
    const wrapper = mountDrillDown(
      scoreEntryFor('No reasoning available.'),
      validatorIdMap,
      snapshotEntryFor({
        asn: 20473,
        as_name: 'AS-VULTR - The Constant Company, LLC, US',
      }),
    )

    expect(networkProviderText(wrapper)).toBe('Vultr')

    wrapper.unmount()
  })

  it('matches known provider aliases inside unknown registry names', () => {
    const cases = [
      {
        asn: 213230,
        asName: 'HETZNER-CLOUD2-AS, DE',
        expected: 'Hetzner',
      },
      {
        asn: 40021,
        asName: 'CONTABO-40021 - Contabo Inc., US',
        expected: 'Contabo',
      },
      {
        asn: 204770,
        asName: 'CHERRYSERVERS3-AS, LT',
        expected: 'Cherry Servers',
      },
      {
        asn: 395839,
        asName: 'HOSTKEY-USA - HOSTKEY, US',
        expected: 'HOSTKEY',
      },
    ]

    cases.forEach(({ asn, asName, expected }) => {
      const wrapper = mountDrillDown(
        scoreEntryFor('No reasoning available.'),
        validatorIdMap,
        snapshotEntryFor({ asn, as_name: asName }),
      )

      expect(networkProviderText(wrapper)).toBe(expected)

      wrapper.unmount()
    })
  })

  it('shows unmatched registry names without prefixing the AS number', () => {
    const rawAsName = 'EXAMPLE-NETWORK-42-AS, US'
    const wrapper = mountDrillDown(
      scoreEntryFor('No reasoning available.'),
      validatorIdMap,
      snapshotEntryFor({
        asn: 64500,
        as_name: rawAsName,
      }),
    )

    expect(networkProviderText(wrapper)).toBe(rawAsName)

    wrapper.unmount()
  })
})
