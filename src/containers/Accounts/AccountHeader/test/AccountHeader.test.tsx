import { mount } from 'enzyme'
import { QueryClientProvider } from 'react-query'
import { I18nextProvider } from 'react-i18next'
import { BrowserRouter } from 'react-router-dom'
import { testQueryClient } from '../../../test/QueryClient'
import i18n from '../../../../i18n/testConfig'
import { AccountHeader } from '..'
import { flushPromises, V7_FUTURE_ROUTER_FLAGS } from '../../../test/utils'

const TEST_ADDRESS = 'rDsbeomae4FXwgQTJp9Rs64Qg9vDiTCdBv'
const TEST_X_ADDRESS = 'XV3oNHx95sqdCkTDCBCVsVeuBmvh2dz5fTZvfw8UCcMVsfe'

describe('AccountHeader Actions', () => {
  const createWrapper = (accountId: string, hasBridge = false, deleted = false) =>
    mount(
      <QueryClientProvider client={testQueryClient}>
        <BrowserRouter future={V7_FUTURE_ROUTER_FLAGS}>
          <I18nextProvider i18n={i18n}>
            <AccountHeader
              accountId={accountId}
              hasBridge={hasBridge}
              deleted={deleted}
            />
          </I18nextProvider>
        </BrowserRouter>
      </QueryClientProvider>,
    )

  beforeEach(() => {
    jest.resetModules()
  })

  it('successful account header', async () => {
    const wrapper = createWrapper(TEST_ADDRESS)
    await flushPromises()
    wrapper.update()

    expect(wrapper.find('.detail-summary-label').text()).toBe('Account')
    expect(wrapper.text()).toContain(TEST_ADDRESS)

    wrapper.unmount()
  })

  it('X-Address', async () => {
    const wrapper = createWrapper(TEST_X_ADDRESS)
    await flushPromises()
    wrapper.update()

    expect(wrapper.text()).toContain(TEST_X_ADDRESS)

    wrapper.unmount()
  })

  it('deleted account', async () => {
    const wrapper = createWrapper(TEST_ADDRESS, false, true)
    await flushPromises()
    wrapper.update()

    expect(wrapper.text()).toContain(TEST_ADDRESS)
    expect(wrapper.find('.status-badge').text()).toBe('Deleted')

    wrapper.unmount()
  })

  it('door account badge', async () => {
    const wrapper = createWrapper(TEST_ADDRESS, true)
    await flushPromises()
    wrapper.update()

    expect(wrapper.find('.status-badge').first().text()).toBe('Door Account')

    wrapper.unmount()
  })
})
