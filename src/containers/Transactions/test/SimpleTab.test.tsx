import { mount } from 'enzyme'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter as Router } from 'react-router-dom'

import { QueryClientProvider } from 'react-query'
import EnableAmendment from './mock_data/EnableAmendment.json'
import Payment from '../../shared/components/Transaction/Payment/test/mock_data/Payment.json'
import { SimpleTab } from '../SimpleTab'
import summarize from '../../../rippled/lib/txSummary'
import i18n from '../../../i18n/testConfig'
import SocketContext from '../../shared/SocketContext'
import MockWsClient from '../../test/mockWsClient'
import { queryClient } from '../../shared/QueryClient'
import { V7_FUTURE_ROUTER_FLAGS } from '../../test/utils'

describe('SimpleTab container', () => {
  let client
  const createWrapper = (tx) =>
    mount(
      <Router future={V7_FUTURE_ROUTER_FLAGS}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <SocketContext.Provider value={client}>
              <SimpleTab
                data={{ processed: tx, summary: summarize(tx, true).details }}
              />
            </SocketContext.Provider>
          </I18nextProvider>
        </QueryClientProvider>
      </Router>,
    )

  beforeEach(() => {
    client = new MockWsClient()
  })

  afterEach(() => {
    client.close()
  })

  it('renders EnableAmendment without crashing', () => {
    const wrapper = createWrapper(EnableAmendment)
    wrapper.unmount()
  })

  it('renders simple tab with transaction rows', () => {
    const wrapper = createWrapper(Payment)
    expect(wrapper.find('.simple-body').length).toBe(1)
    expect(wrapper.find('.rows').length).toBe(1)
    wrapper.unmount()
  })
})
