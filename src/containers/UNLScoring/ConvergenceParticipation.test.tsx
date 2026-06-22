import { mount } from 'enzyme'
import { ConvergenceParticipation } from './ConvergenceParticipation'
import type { ConvergenceResult } from './useConvergence'

const ready = (
  overrides: Partial<ConvergenceResult> = {},
): ConvergenceResult => ({
  status: 'ready',
  phase: 'live',
  finalized: false,
  roundNumber: 273,
  participants: [
    {
      validator_master_key: 'nHUvalidatorKeyAAAAAAAAAAAAAAAAAAAAAA',
      outcome: 'valid',
      comparison_levels_matched: 'RAW,PARSED,SELECTED_UNL',
    },
    {
      validator_master_key: 'nHUvalidatorKeyBBBBBBBBBBBBBBBBBBBBBB',
      outcome: 'divergent',
      comparison_levels_matched: 'RAW',
      conflicting_reveal: true,
    },
  ],
  summary: { committers: 2, outcomes: { valid: 1, divergent: 1 } },
  convergenceBundleCid: null,
  anchorTxHash: null,
  sealedAt: null,
  ...overrides,
})

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

  it('renders per-validator detail for a live round', () => {
    const wrapper = mount(<ConvergenceParticipation result={ready()} />)

    expect(wrapper.text()).toContain('Validator participation')
    expect(wrapper.find('.cr-live-tag').exists()).toBe(true)
    expect(wrapper.text()).toContain('1 / 2')
    expect(
      wrapper.find('[data-testid="cr-participant"]').hostNodes(),
    ).toHaveLength(2)
    expect(wrapper.text()).toContain('Matched')
    expect(wrapper.text()).toContain('Diverged')
    expect(wrapper.text()).toContain('conflicting')

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
    expect(wrapper.find('.cr-table').exists()).toBe(false)
    wrapper.unmount()
  })

  it('surfaces the sealed report links and anchor once finalized', () => {
    const wrapper = mount(
      <ConvergenceParticipation
        result={ready({
          phase: 'sealed',
          finalized: true,
          convergenceBundleCid: 'QmBundleCid',
          anchorTxHash: 'ANCHORHASH',
          sealedAt: '2026-05-25T01:30:00+00:00',
        })}
      />,
    )

    expect(wrapper.find('.cr-live-tag').exists()).toBe(false)
    expect(wrapper.text()).toContain('Open on IPFS')
    expect(wrapper.text()).toContain('Pinata')
    expect(wrapper.text()).toContain('On-chain anchor')
    expect(wrapper.text()).toContain('Sealed')
    expect(wrapper.find('a.audit-gateway-link').prop('href')).toContain(
      'QmBundleCid',
    )

    wrapper.unmount()
  })
})
