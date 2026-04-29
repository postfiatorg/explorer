import { mount } from 'enzyme'
import { act } from 'react-dom/test-utils'
import {
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
