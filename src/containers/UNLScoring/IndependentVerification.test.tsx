import { mount } from 'enzyme'
import { IndependentVerification } from './IndependentVerification'
import type { IndependentVerificationResult } from './useIndependentVerification'

const base: IndependentVerificationResult = {
  status: 'ready',
  announcementTxHash: 'ANN123',
  commitOpensAt: '2026-06-12T13:46:00Z',
  commitClosesAt: '2026-06-12T14:01:00Z',
  revealOpensAt: '2026-06-12T14:01:00Z',
  revealClosesAt: '2026-06-12T14:06:00Z',
  revealWindowClosed: true,
  tally: {
    committed: 6,
    revealed: 5,
    matching: 4,
    divergent: 1,
    committedNoReveal: 1,
  },
}

describe('IndependentVerification', () => {
  it('renders the no-archive note when history is unavailable', () => {
    const wrapper = mount(
      <IndependentVerification
        result={{ ...base, status: 'no_archive', tally: null }}
      />,
    )
    expect(wrapper.text()).toContain('Independent verification')
    expect(wrapper.text()).toContain('no archive node configured')
    expect(wrapper.find('.cr-bar').exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders a note when the archive scan could not be reached', () => {
    const wrapper = mount(
      <IndependentVerification
        result={{ ...base, status: 'error', tally: null }}
      />,
    )
    expect(wrapper.text()).toContain('Independent verification')
    expect(wrapper.text()).toContain('could not be reached')
    expect(wrapper.find('.cr-bar').exists()).toBe(false)
    wrapper.unmount()
  })

  it('renders nothing while loading or when unavailable', () => {
    expect(
      mount(
        <IndependentVerification
          result={{ ...base, status: 'loading', tally: null }}
        />,
      ).html(),
    ).toBeNull()
    expect(
      mount(
        <IndependentVerification
          result={{ ...base, status: 'unavailable', tally: null }}
        />,
      ).html(),
    ).toBeNull()
  })

  it('renders the announcement, windows, headline and a three-segment bar', () => {
    const wrapper = mount(<IndependentVerification result={base} />)

    expect(wrapper.text()).toContain('Announced')
    expect(wrapper.find('a[href="/transactions/ANN123"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Commit window')
    expect(wrapper.text()).toContain('13:46 – 14:01 UTC')
    expect(wrapper.text()).toContain('Reveal window')
    expect(wrapper.text()).toContain('4 / 6')
    expect(wrapper.text()).toContain(
      "committed validators reproduced the foundation's result",
    )
    expect(wrapper.find('.cr-bar-seg')).toHaveLength(3)

    wrapper.unmount()
  })

  it('omits zero-width segments from the bar but keeps them in the legend', () => {
    const wrapper = mount(
      <IndependentVerification
        result={{
          ...base,
          tally: {
            committed: 5,
            revealed: 5,
            matching: 5,
            divergent: 0,
            committedNoReveal: 0,
          },
        }}
      />,
    )
    expect(wrapper.find('.cr-bar-seg')).toHaveLength(1)
    expect(wrapper.find('.cr-legend-row')).toHaveLength(3)
    wrapper.unmount()
  })

  it('shows a no-commit message when nobody committed', () => {
    const wrapper = mount(
      <IndependentVerification
        result={{
          ...base,
          tally: {
            committed: 0,
            revealed: 0,
            matching: 0,
            divergent: 0,
            committedNoReveal: 0,
          },
        }}
      />,
    )
    expect(wrapper.text()).toContain('No validators committed to this round')
    expect(wrapper.find('.cr-bar').exists()).toBe(false)
    wrapper.unmount()
  })
})
