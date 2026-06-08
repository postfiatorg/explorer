import { mount } from 'enzyme'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClientProvider } from 'react-query'
import i18n from '../../../i18n/testConfigEnglish'
import SocketContext from '../../shared/SocketContext'
import MockWsClient from '../../test/mockWsClient'
import { Header } from '../index'
import { queryClient } from '../../shared/QueryClient'
import { useScoringFreshness } from '../../Network/useScoringFreshness'
import { V7_FUTURE_ROUTER_FLAGS } from '../../test/utils'

jest.mock('../../Network/useScoringFreshness')

const mockUseScoringFreshness = useScoringFreshness as jest.MockedFunction<
  typeof useScoringFreshness
>

describe('Header component', () => {
  let client
  const createWrapper = () =>
    mount(
      <I18nextProvider i18n={i18n}>
        <Router future={V7_FUTURE_ROUTER_FLAGS}>
          <SocketContext.Provider value={client}>
            <QueryClientProvider client={queryClient}>
              <Header />
            </QueryClientProvider>
          </SocketContext.Provider>
        </Router>
      </I18nextProvider>,
    )

  beforeEach(() => {
    client = new MockWsClient()
    mockUseScoringFreshness.mockReturnValue({ isFresh: false })
  })

  afterEach(() => {
    client.close()
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const wrapper = createWrapper()
    wrapper.unmount()
  })

  it('renders all parts', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.search').length).toEqual(1)
    expect(wrapper.find('.navbar-brand').hostNodes().length).toEqual(1)
    expect(wrapper.find('.dropdown-toggle-text').hostNodes().text()).toEqual(
      'Network',
    )
    wrapper.unmount()
  })

  it('shows the UNL Scoring freshness dot only on that link when a round is fresh', () => {
    mockUseScoringFreshness.mockReturnValue({ isFresh: true })
    const wrapper = createWrapper()
    const unlScoringLink = wrapper
      .find('a.nav-link[href="/unl-scoring"]')
      .hostNodes()
    const nodesLink = wrapper
      .find('a.nav-link[href="/network/nodes"]')
      .hostNodes()

    expect(unlScoringLink.length).toEqual(1)
    expect(unlScoringLink.find('.nav-label-text').text()).toEqual('UNL Scoring')
    expect(unlScoringLink.find('.nav-freshness-dot').exists()).toBe(true)
    expect(nodesLink.length).toEqual(1)
    expect(nodesLink.find('.nav-freshness-dot').exists()).toBe(false)

    wrapper.unmount()
  })

  it('hides the UNL Scoring freshness dot when no round is fresh', () => {
    mockUseScoringFreshness.mockReturnValue({ isFresh: false })
    const wrapper = createWrapper()
    const unlScoringLink = wrapper
      .find('a.nav-link[href="/unl-scoring"]')
      .hostNodes()

    expect(unlScoringLink.length).toEqual(1)
    expect(unlScoringLink.find('.nav-freshness-dot').exists()).toBe(false)

    wrapper.unmount()
  })
})
