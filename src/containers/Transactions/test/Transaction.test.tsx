import { mount } from 'enzyme'
import { Route } from 'react-router'
import mockTransaction from './mock_data/Transaction.json'
import mockTransactionSummary from './mock_data/TransactionSummary.json'
import i18n from '../../../i18n/testConfig'
import { Transaction } from '../index'
import { TxStatus } from '../../shared/components/TxStatus'
import { getTransaction } from '../../../rippled'
import { Error as RippledError } from '../../../rippled/lib/utils'
import { flushPromises, QuickHarness } from '../../test/utils'
import Mock = jest.Mock

jest.mock('../../../rippled', () => {
  const originalModule = jest.requireActual('../../../rippled')

  return {
    __esModule: true,
    ...originalModule,
    getTransaction: jest.fn(),
  }
})

const mockedGetTransaction: Mock = getTransaction as Mock

window.location.assign(
  '/transactions/50BB0CC6EFC4F5EF9954E654D3230D4480DC83907A843C736B28420C7F02F774',
)

describe('Transaction container', () => {
  const createWrapper = (
    hash = '50BB0CC6EFC4F5EF9954E654D3230D4480DC83907A843C736B28420C7F02F774',
  ) =>
    mount(
      <QuickHarness
        i18n={i18n}
        initialEntries={[`/transactions/${hash}`]}
      >
        <Route
          path="/transactions/:identifier?"
          element={<Transaction />}
        />
      </QuickHarness>,
    )
  afterEach(() => {
    mockedGetTransaction.mockReset()
  })

  it('renders without crashing', () => {
    const wrapper = createWrapper()
    wrapper.unmount()
  })

  it('renders loading', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.loader').length).toBe(1)
    wrapper.unmount()
  })

  it('renders 404 page on no match', async () => {
    mockedGetTransaction.mockImplementation(() =>
      Promise.reject(new RippledError('transaction not found', 404)),
    )

    const wrapper = createWrapper()
    await flushPromises()
    wrapper.update()
    expect(wrapper.find('.no-match .title')).toHaveText('transaction_not_found')
    expect(wrapper.find('.no-match .hint').at(0)).toHaveText(
      'server_ledgers_hint',
    )
    expect(wrapper.find('.no-match .hint').at(1)).toHaveText(
      'check_transaction_hash',
    )
    wrapper.unmount()
  })

  it('renders invalid hash page', async () => {
    const wrapper = createWrapper('aaaa')
    await flushPromises()
    wrapper.update()
    expect(wrapper.find('.no-match .title')).toHaveText(
      'invalid_transaction_hash',
    )
    expect(wrapper.find('.no-match .hint')).toHaveText('check_transaction_hash')
    wrapper.unmount()
  })

  it('renders error page', async () => {
    mockedGetTransaction.mockImplementation(() =>
      Promise.reject(new RippledError('transaction not validated', 500)),
    )
    const wrapper = createWrapper()
    await flushPromises()
    wrapper.update()

    expect(wrapper.find('.no-match .title')).toHaveText('generic_error')
    expect(wrapper.find('.no-match .hint')).toHaveText('not_your_fault')
    wrapper.unmount()
  })

  describe('with results', () => {
    let wrapper

    beforeEach(async () => {
      const transaction = {
        processed: mockTransaction,
        summary: mockTransactionSummary,
      }

      mockedGetTransaction.mockImplementation(() =>
        Promise.resolve(transaction),
      )
    })

    it('renders transaction page sections', async () => {
      wrapper = createWrapper(mockTransaction.hash)
      await flushPromises()
      wrapper.update()

      expect(wrapper.find('.transaction').length).toBe(1)
      expect(wrapper.find('.tx-summary').length).toBe(1)
      expect(wrapper.find('.tx-summary-type').text()).toBe('OfferCreate')
      expect(wrapper.find(TxStatus).length).toBe(1)
      expect(wrapper.find('.tx-overview-grid').length).toBe(1)
      expect(wrapper.find('.simple-body').length).toBe(1)
      expect(wrapper.find('.detail-body').length).toBe(1)
      wrapper.unmount()
    })
  })
})
