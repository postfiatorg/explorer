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

  it('surfaces only the model-output levels in divergence detail', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready()}
        validatorMetaByKey={metaByKey}
      />,
    )
    const levelText = wrapper.find('.cr-diverge').text()
    expect(levelText).toContain('Raw')
    expect(levelText).toContain('Scores')
    // the selection-level comparison is deliberately never surfaced, so
    // sidecar operators on any version render as equal participants
    expect(levelText).not.toContain('UNL selection')
    wrapper.unmount()
  })

  it('hides divergence detail when only unsurfaced levels diverged', () => {
    const historic = ready()
    historic.participants = historic.participants.map((participant) =>
      participant.outcome === 'divergent'
        ? { ...participant, comparison_levels_matched: 'RAW,PARSED' }
        : participant,
    )
    const wrapper = mount(
      <ConvergenceParticipation
        result={historic}
        validatorMetaByKey={metaByKey}
      />,
    )
    // The row still reads diverged, but no detail strip contradicts it by
    // showing every surfaced level as a match.
    expect(wrapper.text()).toContain('Diverged')
    expect(wrapper.find('.cr-diverge').exists()).toBe(false)
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

  it('reads a live awaiting reveal as awaiting rather than a failure', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready({
          participants: [
            { validator_master_key: KEY_A, outcome: 'awaiting_reveal' },
          ],
          summary: { committers: 1 },
        })}
      />,
    )
    expect(wrapper.text()).toContain('Awaiting reveal')
    expect(wrapper.text()).not.toContain('No reveal')
    wrapper.unmount()
  })

  it('keeps old live missing reveal responses as awaiting', () => {
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

  it('treats a live announcement mismatch as terminal, not awaiting', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready({
          participants: [
            { validator_master_key: KEY_A, outcome: 'announcement_mismatch' },
          ],
          summary: { committers: 1 },
        })}
      />,
    )
    expect(wrapper.text()).toContain('Announcement mismatch')
    expect(wrapper.text()).not.toContain('Awaiting reveal')
    wrapper.unmount()
  })

  it('uses terminal labels for unrevealed outcomes once finalized', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready({
          phase: 'sealed',
          finalized: true,
          participants: [
            { validator_master_key: KEY_A, outcome: 'awaiting_reveal' },
            { validator_master_key: KEY_B, outcome: 'late' },
            {
              validator_master_key: 'nHUvalidatorKeyCCCCCCCCCCCCCCCCCCCCCC',
              outcome: 'commitment_mismatch',
            },
            {
              validator_master_key: 'nHUvalidatorKeyDDDDDDDDDDDDDDDDDDDDDD',
              outcome: 'announcement_mismatch',
            },
            {
              validator_master_key: 'nHUvalidatorKeyEEEEEEEEEEEEEEEEEEEEEE',
              outcome: 'signature_invalid',
            },
            {
              validator_master_key: 'nHUvalidatorKeyFFFFFFFFFFFFFFFFFFFFFF',
              outcome: 'missing_reveal',
            },
          ],
          summary: { committers: 6 },
        })}
      />,
    )

    const text = wrapper.text()
    expect(text).not.toContain('Awaiting reveal')
    expect(text).toContain('No reveal')
    expect(text).toContain('Late reveal')
    expect(text).toContain('Commitment mismatch')
    expect(text).toContain('Announcement mismatch')
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
    // the finalized timestamp lives in the header beside the Final tag; it now
    // renders in the viewer's local timezone, so assert the month/year (the day
    // can shift a boundary across timezones) rather than a fixed local date.
    expect(wrapper.find('.cr-final-at').text()).toContain('May 2026')
    expect(wrapper.text()).toContain('Sealed report')
    expect(wrapper.find('a.audit-gateway-alt').exists()).toBe(false)
    const reportLink = wrapper.find('a.audit-gateway-link')
    expect(reportLink.prop('href')).toContain(
      'QmBundleCid/convergence_report.json',
    )
    // relative proxy href, so the new-tab glyph must be forced
    expect(reportLink.hasClass('external')).toBe(true)
    // the anchor renders as a transaction link, matching the page's tx
    // convention: full hash on wide screens, middle-truncated below
    expect(wrapper.find('a.audit-trail-hash-link').prop('href')).toBe(
      '/transactions/ANCHORHASH1234567890',
    )
    expect(wrapper.find('.cr-anchor-full').text()).toBe('ANCHORHASH1234567890')
    expect(wrapper.find('.cr-anchor-short').text()).toBe('ANCHORHASH…567890')

    wrapper.unmount()
  })
})
