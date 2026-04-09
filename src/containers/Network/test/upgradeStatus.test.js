import { mount } from 'enzyme'
import moxios from 'moxios'
import WS from 'jest-websocket-mock'
import { Route } from 'react-router'
import i18n from '../../../i18n/testConfig'
import SocketContext from '../../shared/SocketContext'
import MockWsClient from '../../test/mockWsClient'
import { QuickHarness } from '../../test/utils'
import { UpgradeStatus } from '../UpgradeStatus'
import { UPGRADE_STATUS_ROUTE } from '../../App/routes'

const validatorsData = [
  {
    master_key: 'nHUakYHufAvdx5XqTS2F4Pu7i8fQqDqpKqXN2kUGHhBFcG38GNqL',
    signing_key: 'n9M38x7Sf7epp3gaxgcFxEtwkSc4w2ePb1SgfLiz9bVCr5Lvzrm8',
    unl: true,
    domain: 'validator1.postfiat.org',
    server_version: '2.4.0',
    agreement_30day: { score: '1.00000', missed: 0, total: 1000 },
    chain: 'main',
    partial: false,
  },
  {
    master_key: 'nHB8QMKGt9VB4Vg71VszjBVQnDW3v3QudM4DwFaJfy96bj4Pv9fA',
    signing_key: 'n9KQ2DVL7QhgovChk81W5KSHPDfAJdRTHencE3Y7cnUBsvrc7uMa',
    unl: true,
    domain: 'validator2.postfiat.org',
    server_version: '2.4.0',
    agreement_30day: { score: '0.99900', missed: 1, total: 1000 },
    chain: 'main',
    partial: false,
  },
  {
    master_key: 'nHUVPzAmAmQ2QSc4oE1iLfsGi17qN2ado8PhxvgEkou76FLxAz7C',
    signing_key: 'n9J1GJHtua77TBEzBsA8HGMzu5stCbkLFfvMbx3tZeCgKkAzpc6C',
    unl: false,
    domain: 'external.example.com',
    server_version: '2.3.1',
    agreement_30day: { score: '0.50000', missed: 500, total: 1000 },
    chain: 'main',
    partial: false,
  },
]

describe('UpgradeStatus renders', () => {
  let server
  let client
  const WS_URL = 'ws://localhost:1234'
  const createWrapper = () =>
    mount(
      <SocketContext.Provider value={client}>
        <QuickHarness i18n={i18n} initialEntries={['/network/upgrade-status']}>
          <Route path={UPGRADE_STATUS_ROUTE.path} element={<UpgradeStatus />} />
        </QuickHarness>
      </SocketContext.Provider>,
    )

  beforeEach(async () => {
    server = new WS(WS_URL, { jsonProtocol: true })
    client = new MockWsClient(WS_URL)
    await server.connected
    moxios.install()
  })

  afterEach(async () => {
    moxios.uninstall()
    server.close()
    client.close()
    WS.clean()
  })

  it('renders without crashing', async () => {
    const wrapper = createWrapper()
    wrapper.unmount()
  })

  it('renders loader while fetching', async () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.loader').length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('renders version distribution after data loads', (done) => {
    moxios.stubRequest(new RegExp(`${process.env.VITE_DATA_URL}/validators/`), {
      status: 200,
      response: { validators: validatorsData },
    })
    moxios.stubRequest(/\/api\/v1\/latest-version\//, {
      status: 200,
      response: { version: '2.4.0', network: 'devnet' },
    })

    const wrapper = createWrapper()
    setTimeout(() => {
      wrapper.update()
      expect(wrapper.find('.version-distribution').length).toEqual(1)
      expect(wrapper.find('.version-row').length).toEqual(2)
      done()
    }, 100)
  })

  it('renders latest badge from API response', (done) => {
    moxios.stubRequest(new RegExp(`${process.env.VITE_DATA_URL}/validators/`), {
      status: 200,
      response: { validators: validatorsData },
    })
    moxios.stubRequest(/\/api\/v1\/latest-version\//, {
      status: 200,
      response: { version: '2.4.0', network: 'devnet' },
    })

    const wrapper = createWrapper()
    setTimeout(() => {
      wrapper.update()
      const latestBadge = wrapper.find('.version-latest-badge')
      expect(latestBadge.length).toEqual(1)
      expect(
        latestBadge.closest('.version-row').find('.version-label').text(),
      ).toContain('2.4.0')
      done()
    }, 100)
  })
})
