import { mount } from 'enzyme'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from '../Sidebar'
import { SidebarContext } from '../../SidebarContext'
import {
  useScoringAvailability,
  UseScoringAvailabilityResult,
} from '../../../Network/useScoringAvailability'
import { useScoringFreshness } from '../../../Network/useScoringFreshness'
import { V7_FUTURE_ROUTER_FLAGS } from '../../../test/utils'

jest.mock('../../../Network/useScoringAvailability')
jest.mock('../../../Network/useScoringFreshness')

const mockUseScoringAvailability =
  useScoringAvailability as jest.MockedFunction<typeof useScoringAvailability>
const mockUseScoringFreshness = useScoringFreshness as jest.MockedFunction<
  typeof useScoringFreshness
>

const availableScoringState: UseScoringAvailabilityResult = {
  state: 'available',
  isFetching: false,
  refetch: jest.fn(),
}

describe('Sidebar', () => {
  const createWrapper = (collapsed = false) =>
    mount(
      <MemoryRouter future={V7_FUTURE_ROUTER_FLAGS}>
        <SidebarContext.Provider value={{ collapsed, setCollapsed: jest.fn() }}>
          <Sidebar />
        </SidebarContext.Provider>
      </MemoryRouter>,
    )

  beforeEach(() => {
    mockUseScoringAvailability.mockReturnValue(availableScoringState)
    mockUseScoringFreshness.mockReturnValue({ isFresh: false })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('shows the UNL Scoring freshness dot only on that link when a round is fresh', () => {
    mockUseScoringFreshness.mockReturnValue({ isFresh: true })
    const wrapper = createWrapper()
    const unlScoringLink = wrapper
      .find('a.sidebar-item[href="/unl-scoring"]')
      .hostNodes()
    const nodesLink = wrapper
      .find('a.sidebar-item[href="/network/nodes"]')
      .hostNodes()

    expect(unlScoringLink.length).toEqual(1)
    expect(unlScoringLink.find('.sidebar-item-label').text()).toEqual(
      'UNL Scoring',
    )
    expect(unlScoringLink.find('.sidebar-item-freshness-dot').exists()).toBe(
      true,
    )
    expect(nodesLink.length).toEqual(1)
    expect(nodesLink.find('.sidebar-item-freshness-dot').exists()).toBe(false)

    wrapper.unmount()
  })

  it('hides the UNL Scoring freshness dot when no round is fresh', () => {
    mockUseScoringFreshness.mockReturnValue({ isFresh: false })
    const wrapper = createWrapper()
    const unlScoringLink = wrapper
      .find('a.sidebar-item[href="/unl-scoring"]')
      .hostNodes()

    expect(unlScoringLink.length).toEqual(1)
    expect(unlScoringLink.find('.sidebar-item-freshness-dot').exists()).toBe(
      false,
    )

    wrapper.unmount()
  })
})
