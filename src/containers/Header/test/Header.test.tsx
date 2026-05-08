import { mount } from 'enzyme'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter as Router } from 'react-router-dom'
import { QueryClientProvider } from 'react-query'
import i18n from '../../../i18n/testConfigEnglish'
import SocketContext from '../../shared/SocketContext'
import MockWsClient from '../../test/mockWsClient'
import { Header } from '../index'
import { queryClient } from '../../shared/QueryClient'
import { V7_FUTURE_ROUTER_FLAGS } from '../../test/utils'

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
  })

  afterEach(() => {
    client.close()
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

  it('renders the UNL Scoring navigation badge without changing other links', () => {
    const wrapper = createWrapper()
    const unlScoringLink = wrapper
      .find('a.nav-link[href="/unl-scoring"]')
      .hostNodes()
    const nodesLink = wrapper
      .find('a.nav-link[href="/network/nodes"]')
      .hostNodes()

    expect(unlScoringLink.length).toEqual(1)
    expect(unlScoringLink.find('.nav-label-text').text()).toEqual('UNL Scoring')
    expect(unlScoringLink.find('.nav-badge').text()).toEqual('NEW')
    expect(nodesLink.length).toEqual(1)
    expect(nodesLink.find('.nav-badge').exists()).toBe(false)

    wrapper.unmount()
  })
})
