import { mount } from 'enzyme'
import { ConvergenceParticipation } from './ConvergenceParticipation'
import type { ConvergenceResult } from './useConvergence'
import type { ValidatorMeta } from './RankedTable'

// The embedded commit/reveal timeline reads config through react-query; these
// tests exercise the participation rows only, so stub it out to keep them free of
// a QueryClient (the timeline has its own suite).
jest.mock('./useScoringConfig', () => ({ useScoringConfig: () => null }))

const KEY_A = 'nHUvalidatorKeyAAAAAAAAAAAAAAAAAAAAAA'
const KEY_B = 'nHUvalidatorKeyBBBBBBBBBBBBBBBBBBBBBB'

const ready = (
  overrides: Partial<ConvergenceResult> = {},
): ConvergenceResult => ({
  status: 'ready',
  phase: 'live',
  finalized: false,
  roundNumber: 273,
  participants: [
    {
      validator_master_key: KEY_A,
      outcome: 'valid',
      comparison_levels_matched: 'RAW,PARSED,SELECTED_UNL',
    },
    {
      validator_master_key: KEY_B,
      outcome: 'divergent',
      comparison_levels_matched: 'RAW',
    },
  ],
  summary: { committers: 2, outcomes: { valid: 1, divergent: 1 } },
  convergenceBundleCid: null,
  anchorTxHash: null,
  sealedAt: null,
  ...overrides,
})

const metaByKey = new Map<string, ValidatorMeta>([
  [KEY_A, { domain: 'validator.example.com', domainVerified: true }],
])

describe('ConvergenceParticipation', () => {
  it('renders nothing while loading', () => {
    const wrapper = mount(
      <ConvergenceParticipation result={{ ...ready(), status: 'loading' }} />,
    )
    expect(wrapper.isEmptyRender()).toBe(true)
    wrapper.unmount()
  })

  it('renders nothing when unavailable (old backend or untracked round)', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={{ ...ready(), status: 'unavailable' }}
      />,
    )
    expect(wrapper.isEmptyRender()).toBe(true)
    wrapper.unmount()
  })

  it('renders a status-per-validator row for a live round', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready()}
        validatorMetaByKey={metaByKey}
      />,
    )

    expect(wrapper.text()).toContain('Independent verification')
    expect(wrapper.find('.cr-live-tag').exists()).toBe(true)
    expect(
      wrapper.find('[data-testid="cr-participant"]').hostNodes(),
    ).toHaveLength(2)
    expect(wrapper.text()).toContain('Matched')
    expect(wrapper.text()).toContain('Diverged')
    // the divergence detail surfaces which reproducibility level differs
    expect(wrapper.find('.cr-diverge .cr-lev-n').exists()).toBe(true)
    expect(wrapper.text()).toContain('differs')

    wrapper.unmount()
  })

  it('renders the linked domain without a domain-attestation badge', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready()}
        validatorMetaByKey={metaByKey}
      />,
    )
    expect(wrapper.find('a.cr-dom').text()).toBe('validator.example.com')
    // the domain-attestation badge was intentionally removed from this panel
    expect(wrapper.find('.cr-verified').exists()).toBe(false)
    wrapper.unmount()
  })

  it('reads a live missing reveal as awaiting rather than a failure', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready({
          participants: [
            { validator_master_key: KEY_A, outcome: 'missing_reveal' },
          ],
          summary: { committers: 1 },
        })}
      />,
    )
    expect(wrapper.text()).toContain('Awaiting reveal')
    expect(wrapper.text()).not.toContain('No reveal')
    wrapper.unmount()
  })

  it('uses terminal labels for unrevealed outcomes once finalized', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready({
          phase: 'sealed',
          finalized: true,
          participants: [
            { validator_master_key: KEY_A, outcome: 'missing_reveal' },
            { validator_master_key: KEY_B, outcome: 'late' },
            {
              validator_master_key: 'nHUvalidatorKeyCCCCCCCCCCCCCCCCCCCCCC',
              outcome: 'commitment_mismatch',
            },
            {
              validator_master_key: 'nHUvalidatorKeyDDDDDDDDDDDDDDDDDDDDDD',
              outcome: 'signature_invalid',
            },
          ],
          summary: { committers: 4 },
        })}
      />,
    )

    const text = wrapper.text()
    expect(text).not.toContain('Awaiting reveal')
    expect(text).toContain('No reveal')
    expect(text).toContain('Late reveal')
    expect(text).toContain('Commitment mismatch')
    expect(text).toContain('Invalid signature')

    wrapper.unmount()
  })

  it('shows an empty-state message when no validator committed', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready({
          participants: [],
          summary: { committers: 0, outcomes: {} },
        })}
      />,
    )
    expect(wrapper.text()).toContain(
      'No validators committed to this round on chain.',
    )
    expect(wrapper.find('.cr-rows').exists()).toBe(false)
    wrapper.unmount()
  })

  it('marks the round Final and surfaces the sealed report once finalized', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready({
          phase: 'sealed',
          finalized: true,
          convergenceBundleCid: 'QmBundleCid',
          anchorTxHash: 'ANCHORHASH1234567890',
          sealedAt: '2026-05-25T01:30:00+00:00',
        })}
      />,
    )

    expect(wrapper.find('.cr-live-tag').exists()).toBe(false)
    expect(wrapper.find('.cr-final-tag').exists()).toBe(true)
    // the finalized timestamp lives in the header beside the Final tag
    expect(wrapper.find('.cr-final-at').text()).toContain('25 May 2026')
    expect(wrapper.text()).toContain('Open on IPFS')
    expect(wrapper.text()).toContain('Public gateway')
    expect(wrapper.find('a.audit-gateway-link').prop('href')).toContain(
      'QmBundleCid/convergence_report.json',
    )
    // the anchor renders as a transaction link, matching the page's tx convention
    expect(wrapper.find('a.audit-trail-hash-link').prop('href')).toBe(
      '/transactions/ANCHORHASH1234567890',
    )

    wrapper.unmount()
  })
})
