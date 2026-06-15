import { mount } from 'enzyme'
import { AuditTrailPanel } from './AuditTrailPanel'
import { useAuditTrail } from './useAuditTrail'
import { useIndependentVerification } from './useIndependentVerification'
import type { ScoringRoundMeta } from '../Network/scoringUtils'

jest.mock('./useAuditTrail', () => ({
  __esModule: true,
  useAuditTrail: jest.fn(),
}))

jest.mock('./useIndependentVerification', () => ({
  __esModule: true,
  useIndependentVerification: jest.fn(),
}))

// The suite runs with resetMocks, so the verification hook's return must be
// re-stubbed before each test. These panel tests cover the Task 1 surfaces, so
// the section stays inert ('unavailable' renders nothing).
beforeEach(() => {
  ;(useIndependentVerification as jest.Mock).mockReturnValue({
    status: 'unavailable',
    announcementTxHash: null,
    commitOpensAt: null,
    commitClosesAt: null,
    revealOpensAt: null,
    revealClosesAt: null,
    revealWindowClosed: false,
    tally: null,
  })
})

const round = (
  status = 'COMPLETE',
  extra: Partial<ScoringRoundMeta> = {},
): ScoringRoundMeta => ({
  round_number: 240,
  status,
  completed_at: '2026-04-29T12:00:00Z',
  ipfs_cid: 'QmMemoWarningCid',
  vl_sequence: 7,
  github_pages_commit_url:
    'https://github.com/postfiatorg/postfiatorg.github.io/commit/abc',
  ...extra,
})

const auditTrailData = (overrides = {}) => ({
  vlEffectiveIso: '2026-04-29T13:00:00.000Z',
  vlExpiresIso: '2026-05-29T13:00:00.000Z',
  memoLedger: 12345,
  memoBodyText: '{"round_number":240}',
  signedVl: { blobs_v2: [{ blob: 'eyJzZXF1ZW5jZSI6N30=' }] },
  vlJsonAvailable: true,
  verificationHashes: null,
  ...overrides,
})

describe('AuditTrailPanel memo warnings', () => {
  beforeEach(() => {
    ;(useAuditTrail as jest.Mock).mockReturnValue(auditTrailData())
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('shows explicit memo failure context for memo-failed published rounds', () => {
    const wrapper = mount(
      <AuditTrailPanel
        round={round('VL_PUBLISHED_MEMO_FAILED', {
          memo_tx_hash: null,
          error_message: 'ONCHAIN_PUBLISHED: tecNO_DST',
        })}
      />,
    )

    expect(wrapper.find('.audit-trail-placeholder').exists()).toBe(false)
    expect(wrapper.text()).toContain('Published outputs')
    expect(wrapper.text()).toContain('Final bundle CID')
    expect(wrapper.text()).toContain('On-chain memo')
    expect(wrapper.text()).toContain(
      'Memo publication failed after the VL was published.',
    )
    expect(wrapper.text()).toContain('No memo transaction was anchored')
    expect(wrapper.text()).toContain('ONCHAIN_PUBLISHED: tecNO_DST')
    expect(wrapper.find('.audit-trail-hash-link').exists()).toBe(false)

    wrapper.unmount()
  })

  it('preserves normal memo transaction rendering for completed rounds', () => {
    const wrapper = mount(
      <AuditTrailPanel
        round={round('COMPLETE', {
          memo_tx_hash: 'ABC123',
        })}
      />,
    )

    expect(wrapper.find('.audit-trail-hash-link').text()).toBe('ABC123')
    expect(wrapper.text()).toContain('"round_number": 240')
    expect(wrapper.text()).not.toContain('Memo publication failed')

    wrapper.unmount()
  })

  it('uses final_bundle_cid when legacy ipfs_cid is absent', () => {
    const wrapper = mount(
      <AuditTrailPanel
        round={round('VL_PUBLISHED_MEMO_FAILED', {
          ipfs_cid: null,
          final_bundle_cid: 'QmFinalBundleCid',
          memo_tx_hash: null,
        })}
      />,
    )

    expect(wrapper.find('.audit-trail-placeholder').exists()).toBe(false)
    expect(wrapper.text()).toContain('QmFinalBundleCid')

    wrapper.unmount()
  })
})

describe('AuditTrailPanel frozen input package', () => {
  beforeEach(() => {
    ;(useAuditTrail as jest.Mock).mockReturnValue(auditTrailData())
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the frozen input package when present', () => {
    const wrapper = mount(
      <AuditTrailPanel
        round={round('COMPLETE', {
          memo_tx_hash: 'ABC123',
          input_package_cid: 'QmInputPackageCid',
          input_package_hash: 'feedface00',
          input_frozen_at: '2026-04-29T11:30:00Z',
        })}
      />,
    )

    expect(wrapper.find('.audit-trail-cols').exists()).toBe(true)
    expect(wrapper.text()).toContain('Frozen inputs')
    expect(wrapper.text()).toContain('Input package CID')
    expect(wrapper.text()).toContain('QmInputPackageCid')
    expect(wrapper.text()).toContain('Package hash')
    expect(wrapper.text()).toContain('feedface00')
    expect(wrapper.text()).toContain('2026-04-29 11:30 UTC')

    wrapper.unmount()
  })

  it('omits the frozen input package and the two-column layout when absent', () => {
    const wrapper = mount(
      <AuditTrailPanel round={round('COMPLETE', { memo_tx_hash: 'ABC123' })} />,
    )

    expect(wrapper.find('.audit-trail-cols').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Frozen inputs')
    expect(wrapper.text()).toContain('Published outputs')

    wrapper.unmount()
  })

  it('omits the package hash row when the hash is missing', () => {
    const wrapper = mount(
      <AuditTrailPanel
        round={round('COMPLETE', {
          memo_tx_hash: 'ABC123',
          input_package_cid: 'QmInputPackageCid',
        })}
      />,
    )

    expect(wrapper.text()).toContain('Frozen inputs')
    expect(wrapper.text()).not.toContain('Package hash')

    wrapper.unmount()
  })
})

describe('AuditTrailPanel reproducible output hashes', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders the three reproducible hashes when available', () => {
    ;(useAuditTrail as jest.Mock).mockReturnValue(
      auditTrailData({
        verificationHashes: {
          model_response_hash: 'aaa111',
          validator_scores_hash: 'bbb222',
          selected_unl_hash: 'ccc333',
        },
      }),
    )

    const wrapper = mount(
      <AuditTrailPanel round={round('COMPLETE', { memo_tx_hash: 'ABC123' })} />,
    )

    expect(wrapper.text()).toContain('Reproducible output hashes')
    expect(wrapper.find('.audit-hash-table tbody tr')).toHaveLength(3)
    expect(wrapper.text()).toContain('Model response')
    expect(wrapper.text()).toContain('aaa111')
    expect(wrapper.text()).toContain('Validator scores')
    expect(wrapper.text()).toContain('bbb222')
    expect(wrapper.text()).toContain('Selected UNL')
    expect(wrapper.text()).toContain('ccc333')

    wrapper.unmount()
  })

  it('omits hash rows whose value is missing', () => {
    ;(useAuditTrail as jest.Mock).mockReturnValue(
      auditTrailData({
        verificationHashes: {
          model_response_hash: 'aaa111',
          validator_scores_hash: null,
          selected_unl_hash: undefined,
        },
      }),
    )

    const wrapper = mount(
      <AuditTrailPanel round={round('COMPLETE', { memo_tx_hash: 'ABC123' })} />,
    )

    expect(wrapper.find('.audit-hash-table tbody tr')).toHaveLength(1)
    expect(wrapper.text()).toContain('Model response')
    expect(wrapper.text()).not.toContain('Validator scores')

    wrapper.unmount()
  })

  it('omits the hashes section entirely when none are available', () => {
    ;(useAuditTrail as jest.Mock).mockReturnValue(auditTrailData())

    const wrapper = mount(
      <AuditTrailPanel round={round('COMPLETE', { memo_tx_hash: 'ABC123' })} />,
    )

    expect(wrapper.text()).not.toContain('Reproducible output hashes')
    expect(wrapper.find('.audit-hash-table').exists()).toBe(false)

    wrapper.unmount()
  })
})
