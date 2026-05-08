import { mount } from 'enzyme'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from '../Sidebar'
import { SidebarContext } from '../../SidebarContext'
import {
  useScoringAvailability,
  UseScoringAvailabilityResult,
} from '../../../Network/useScoringAvailability'
import { V7_FUTURE_ROUTER_FLAGS } from '../../../test/utils'

jest.mock('../../../Network/useScoringAvailability')

const mockUseScoringAvailability =
  useScoringAvailability as jest.MockedFunction<typeof useScoringAvailability>

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
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the UNL Scoring badge without changing other sidebar links', () => {
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
    expect(unlScoringLink.find('.sidebar-item-badge').text()).toEqual('NEW')
    expect(nodesLink.length).toEqual(1)
    expect(nodesLink.find('.sidebar-item-badge').exists()).toBe(false)

    wrapper.unmount()
  })
})
