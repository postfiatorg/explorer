import { mount } from 'enzyme'
import moxios from 'moxios'
import { Route } from 'react-router-dom'
import { NOT_FOUND } from '../../shared/utils'
import { Validator } from '../index'
import { getLedger } from '../../../rippled'
import NetworkContext from '../../shared/NetworkContext'
import testConfigEnglish from '../../../i18n/testConfigEnglish'
import { QuickHarness, flushPromises } from '../../test/utils'
import { testQueryClient } from '../../test/QueryClient'
import { VALIDATOR_ROUTE } from '../../App/routes'
import { useScoringAvailability } from '../../Network/useScoringAvailability'
import { useScoringContext } from '../../Network/useScoringContext'

global.location = '/validators/aaaa'

const MOCK_IDENTIFIER = 'mock-validator-hash'

jest.mock('../../../rippled', () => ({
  __esModule: true,
  getLedger: jest.fn(),
}))

jest.mock('../../Network/useScoringAvailability', () => ({
  __esModule: true,
  useScoringAvailability: jest.fn(),
}))

jest.mock('../../Network/useScoringContext', () => ({
  __esModule: true,
  useScoringContext: jest.fn(),
}))

const scoredRound = {
  round_number: 242,
  status: 'COMPLETE',
  completed_at: '2026-05-05T12:00:00Z',
  override_type: null,
}

const scoringContext = ({ validatorScores = [], roundConfig = null } = {}) => ({
  activeRound: scoredRound,
  round: scoredRound,
  unl: {
    round_number: scoredRound.round_number,
    unl: [],
    alternates: [],
  },
  scores: {
    validator_scores: validatorScores,
  },
  config: null,
  roundConfig,
})

const scoreEntry = (masterKey) => ({
  master_key: masterKey,
  score: 91,
  consensus: 92,
  reliability: 90,
  software: 91,
  diversity: 88,
  identity: 94,
  reasoning: 'Scored validator',
})

describe('Validator container', () => {
  const setScoringHooks = (context = null) => {
    useScoringAvailability.mockReturnValue({
      state: context ? 'available' : 'genesis',
      isFetching: false,
      refetch: jest.fn(),
    })
    useScoringContext.mockReturnValue({
      context,
      latestAttempt: null,
    })
  }

  const stubValidator = ({
    masterKey,
    serverVersion,
    ledgerHash = 'sample-ledger-hash',
  }) => {
    moxios.stubRequest(
      `${process.env.VITE_DATA_URL}/validator/${MOCK_IDENTIFIER}`,
      {
        status: 200,
        response: {
          master_key: masterKey,
          ledger_hash: ledgerHash,
          server_version: serverVersion,
        },
      },
    )
    moxios.stubRequest(
      `${process.env.VITE_DATA_URL}/validator/${MOCK_IDENTIFIER}/reports`,
      {
        status: 200,
        response: { reports: [] },
      },
    )
  }

  const createWrapper = (props = {}) => {
    const defaultGetLedgerImpl = () =>
      new Promise(
        () => {},
        () => {},
      )
    getLedger.mockImplementation(props.getLedgerImpl || defaultGetLedgerImpl)

    return mount(
      <NetworkContext.Provider value={props.network || 'main'}>
        <QuickHarness
          i18n={testConfigEnglish}
          initialEntries={[`/validators/${MOCK_IDENTIFIER}`]}
        >
          <Route path={VALIDATOR_ROUTE.path} element={<Validator />} />
        </QuickHarness>
      </NetworkContext.Provider>,
    )
  }

  beforeEach(async () => {
    moxios.install()
    setScoringHooks()
  })

  afterEach(() => {
    moxios.uninstall()
    testQueryClient.clear()
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.validator').length).toBe(1)
    wrapper.unmount()
  })

  it('renders loading', () => {
    const wrapper = createWrapper()
    expect(wrapper.find('.loader').length).toBe(1)
    wrapper.unmount()
  })

  it('sets title to domain', async () => {
    moxios.stubRequest(
      `${process.env.VITE_DATA_URL}/validator/${MOCK_IDENTIFIER}`,
      {
        status: 200,
        response: {
          domain: 'example.com',
          ledger_hash: 'sample-ledger-hash',
          master_key: 'foo',
        },
      },
    )
    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()
    expect(document.title).toBe('Validator example.com')
    wrapper.unmount()
  })

  it('sets title to master_key', async () => {
    moxios.stubRequest(
      `${process.env.VITE_DATA_URL}/validator/${MOCK_IDENTIFIER}`,
      {
        status: 200,
        response: {
          master_key: 'foo',
          ledger_hash: 'sample-ledger-hash',
        },
      },
    )
    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()
    expect(document.title).toBe('Validator foo...')
    wrapper.unmount()
  })

  it('sets title to signing_key', async () => {
    moxios.stubRequest(
      `${process.env.VITE_DATA_URL}/validator/${MOCK_IDENTIFIER}`,
      {
        status: 200,
        response: {
          signing_key: 'bar',
          ledger_hash: 'sample-ledger-hash',
        },
      },
    )
    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()
    expect(document.title).toBe('Validator bar...')
    wrapper.unmount()
  })

  it('fetches ledger hash if not provided', async () => {
    moxios.stubRequest(
      `${process.env.VITE_DATA_URL}/validator/${MOCK_IDENTIFIER}`,
      {
        status: 200,
        response: {
          master_key: 'foo',
          domain: 'test.example.com',
          current_index: '12345',
        },
      },
    )
    const ledger = {
      status: 200,
      response: {
        ledger_hash: 'sample-ledger-hash',
        last_ledger_time: 123456789,
      },
    }
    const wrapper = createWrapper({
      getLedgerImpl: () => Promise.resolve(ledger),
    })
    await flushPromises()
    await flushPromises()
    expect(getLedger).toBeCalledTimes(1)
    expect(getLedger).toHaveBeenCalledWith('12345', undefined)
    expect(document.title).toBe('Validator test.example.com')
    wrapper.unmount()
  })

  it('renders 404 page on no match', async () => {
    moxios.stubRequest(
      `${process.env.VITE_DATA_URL}/validator/${MOCK_IDENTIFIER}`,
      {
        status: NOT_FOUND,
        response: { error: 'something went wrong' },
      },
    )
    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()
    wrapper.update()
    expect(wrapper.find('.no-match').length).toBe(1)
    wrapper.unmount()
  })

  it('displays all details except last ledger date/time on ledger 404 error', async () => {
    moxios.stubRequest(
      `${process.env.VITE_DATA_URL}/validator/${MOCK_IDENTIFIER}`,
      {
        status: 200,
        response: {
          master_key: 'foo',
          domain: 'test.example.com',
          current_index: '12345',
        },
      },
    )

    const notFoundError = new Error('Ledger not found')
    notFoundError.response = { status: 404 }

    const wrapper = createWrapper({
      getLedgerImpl: () => Promise.reject(notFoundError),
    })

    await flushPromises()
    await flushPromises()

    wrapper.update()

    expect(getLedger).toBeCalledWith('12345', undefined)
    expect(document.title).toBe('Validator test.example.com')
    // test ledger-time isn't updated
    expect(wrapper.find('.validator-details').text()).not.toContain(
      'Last Ledger',
    )
    // test ledger-index stays the same
    expect(wrapper.find('.validator-details').text()).toContain('12345')
    wrapper.unmount()
  })

  it('explains validators excluded from scoring by server version', async () => {
    const masterKey = 'nHBexcluded'
    setScoringHooks(
      scoringContext({
        roundConfig: {
          excluded_validator_server_versions: ['3.0.0'],
        },
      }),
    )
    stubValidator({ masterKey, serverVersion: '3.0.0' })

    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()
    wrapper.update()

    const scoringMessage = wrapper.find('.detail-scoring-no-data')
    expect(scoringMessage).toHaveText(
      'This validator was intentionally excluded from the latest scored round because it is running server version 3.0.0, which is not eligible for Dynamic UNL scoring.',
    )
    expect(scoringMessage.text()).not.toContain('no registration required')
    wrapper.unmount()
  })

  it('keeps the generic no-score message when scoring config is unavailable', async () => {
    const masterKey = 'nHBunscored'
    setScoringHooks(scoringContext())
    stubValidator({ masterKey, serverVersion: '3.0.0' })

    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()
    wrapper.update()

    expect(wrapper.find('.detail-scoring-no-data').text()).toContain(
      'no registration required',
    )
    wrapper.unmount()
  })

  it('keeps the generic no-score message for non-excluded versions', async () => {
    const masterKey = 'nHBcurrent'
    setScoringHooks(
      scoringContext({
        roundConfig: {
          excluded_validator_server_versions: ['3.0.0'],
        },
      }),
    )
    stubValidator({ masterKey, serverVersion: '3.0.1' })

    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()
    wrapper.update()

    expect(wrapper.find('.detail-scoring-no-data').text()).toContain(
      'no registration required',
    )
    wrapper.unmount()
  })

  it('keeps the score breakdown when a score entry exists', async () => {
    const masterKey = 'nHBscored'
    setScoringHooks(
      scoringContext({
        validatorScores: [scoreEntry(masterKey)],
        roundConfig: {
          excluded_validator_server_versions: ['3.0.0'],
        },
      }),
    )
    stubValidator({ masterKey, serverVersion: '3.0.0' })

    const wrapper = createWrapper()
    await flushPromises()
    await flushPromises()
    wrapper.update()

    expect(wrapper.find('.detail-scoring-no-data')).not.toExist()
    expect(wrapper.find('.detail-scoring-dim-row')).toHaveLength(5)
    expect(wrapper.find('.detail-scoring-link')).toHaveText(
      'View reasoning and round history →',
    )
    wrapper.unmount()
  })
})
