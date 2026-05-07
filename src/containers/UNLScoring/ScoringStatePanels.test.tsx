import { mount } from 'enzyme'
import { act } from 'react-dom/test-utils'
import {
  ScoringFailedRoundPanel,
  ScoringFinalizingRoundPanel,
  ScoringRunningRoundPanel,
} from './ScoringStatePanels'

describe('ScoringRunningRoundPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-29T12:01:10Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders a running round as a non-error state', () => {
    const wrapper = mount(
      <ScoringRunningRoundPanel
        round={{
          round_number: 207,
          status: 'COLLECTING',
          created_at: '2026-04-29T12:00:00Z',
          started_at: '2026-04-29T12:01:00Z',
          completed_at: null,
        }}
      />,
    )

    expect(wrapper.find('.unl-scoring-running-round').exists()).toBe(true)
    expect(wrapper.text()).toContain('Round #207 is running')
    expect(wrapper.text()).toContain('COLLECTING')
    expect(wrapper.text()).toContain('10s ago')
    expect(wrapper.text()).toContain('Scoring artifacts are not available yet.')
    expect(wrapper.text()).not.toContain('Round not found')

    wrapper.unmount()
  })

  it('updates elapsed time locally once per second', () => {
    const wrapper = mount(
      <ScoringRunningRoundPanel
        round={{
          round_number: 207,
          status: 'VL_SIGNED',
          created_at: '2026-04-29T12:00:00Z',
          started_at: '2026-04-29T12:01:00Z',
          completed_at: null,
        }}
      />,
    )

    expect(wrapper.text()).toContain('10s ago')

    act(() => {
      jest.advanceTimersByTime(1000)
    })
    wrapper.update()

    expect(wrapper.text()).toContain('11s ago')

    wrapper.unmount()
  })
})

describe('ScoringFinalizingRoundPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-29T12:01:10Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders a completed round while artifacts are loading', () => {
    const wrapper = mount(
      <ScoringFinalizingRoundPanel
        round={{
          round_number: 207,
          status: 'COMPLETE',
          created_at: '2026-04-29T12:00:00Z',
          started_at: '2026-04-29T12:01:00Z',
          completed_at: '2026-04-29T12:01:05Z',
        }}
      />,
    )

    expect(wrapper.find('.unl-scoring-finalizing-round').exists()).toBe(true)
    expect(wrapper.text()).toContain('Round #207 completed')
    expect(wrapper.text()).toContain('Loading scoring artifacts.')
    expect(wrapper.text()).toContain('COMPLETE')
    expect(wrapper.text()).toContain('5s ago')
    expect(wrapper.text()).not.toContain('Round not found')

    wrapper.unmount()
  })
})

describe('ScoringFailedRoundPanel', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-29T12:01:10Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders a failed round as a terminal state without loading output', () => {
    const wrapper = mount(
      <ScoringFailedRoundPanel
        round={{
          round_number: 207,
          status: 'FAILED',
          created_at: '2026-04-29T12:00:00Z',
          started_at: '2026-04-29T12:01:00Z',
          completed_at: null,
          snapshot_hash: null,
          error_message: 'collector timed out while querying validators',
        }}
      />,
    )

    expect(wrapper.find('.unl-scoring-failed-round').exists()).toBe(true)
    expect(wrapper.text()).toContain('Round #207 failed')
    expect(wrapper.text()).toContain(
      'This scoring round failed during collecting',
    )
    expect(wrapper.text()).toContain('FAILED at COLLECTING')
    expect(wrapper.text()).toContain('started 10s ago')
    expect(wrapper.text()).toContain('Technical detail')
    expect(wrapper.text()).toContain(
      'collector timed out while querying validators',
    )
    expect(wrapper.find('.unl-scoring-empty').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Ranked validators')
    expect(wrapper.text()).not.toContain('Loading scoring artifacts')

    wrapper.unmount()
  })

  it('omits technical detail when no error message is present', () => {
    const wrapper = mount(
      <ScoringFailedRoundPanel
        round={{
          round_number: 208,
          status: 'FAILED',
          created_at: '2026-04-29T12:00:00Z',
          started_at: '2026-04-29T12:01:00Z',
          completed_at: null,
          snapshot_hash: 'snapshot-hash',
          scores_hash: null,
        }}
      />,
    )

    expect(wrapper.text()).toContain('Round #208 failed')
    expect(wrapper.text()).toContain('FAILED at SCORED')
    expect(wrapper.find('.unl-scoring-failed-round-detail').exists()).toBe(
      false,
    )

    wrapper.unmount()
  })
})
