import {
  classifyRoundState,
  computeValidatorDelta,
  deriveFailedAtStage,
  findLatestScoredRound,
  findPreviousScoredRound,
  getExcludedScoringServerVersion,
  getRoundBundleCid,
  getRoundInputPackageCid,
  getScoringInfoForValidator,
  isInProgressRound,
  isOperationallyPublishedRound,
  isRoundFresh,
  isScoredRound,
  roundScoringConfigFromExecutionManifest,
} from '../scoringUtils'
import type { ScoringRoundMeta } from '../scoringUtils'

const round = (
  roundNumber: number,
  status = 'COMPLETE',
  overrideType: string | null = null,
): ScoringRoundMeta => ({
  round_number: roundNumber,
  status,
  completed_at: `2026-04-${String(roundNumber).padStart(2, '0')}T00:00:00Z`,
  override_type: overrideType,
})

const scoreEntry = (masterKey: string, score: number) => ({
  master_key: masterKey,
  score,
  consensus: score,
  reliability: score,
  software: score,
  diversity: score,
  identity: score,
  reasoning: 'Validator score',
})

describe('scoringUtils override handling', () => {
  it('treats completed override rounds as unscored rounds', () => {
    expect(isScoredRound(round(10, 'COMPLETE', 'custom'))).toBe(false)
    expect(isScoredRound(round(9))).toBe(true)
    expect(isScoredRound(round(11, 'VL_PUBLISHED_MEMO_FAILED'))).toBe(true)
    expect(isScoredRound(round(12, 'VL_PUBLISHED_MEMO_FAILED', 'custom'))).toBe(
      false,
    )
    expect(isScoredRound(round(8, 'FAILED'))).toBe(false)
  })

  it('finds the latest completed non-override scored round', () => {
    expect(
      findLatestScoredRound([
        round(11, 'COMPLETE', 'custom'),
        round(10, 'VL_PUBLISHED_MEMO_FAILED'),
        round(9),
        round(8, 'FAILED'),
        round(7),
      ])?.round_number,
    ).toBe(10)
  })

  it('finds the previous scored round while skipping overrides', () => {
    expect(
      findPreviousScoredRound(
        [round(10), round(9, 'COMPLETE', 'custom'), round(8)],
        10,
      )?.round_number,
    ).toBe(8)
  })

  it('uses active UNL membership with latest scored-round scores', () => {
    const info = getScoringInfoForValidator('active-unscored', {
      activeRound: round(12, 'COMPLETE', 'custom'),
      unl: {
        round_number: 12,
        unl: ['active-scored', 'active-unscored'],
        alternates: [],
      },
      scores: {
        validator_scores: [
          {
            master_key: 'active-scored',
            score: 82,
            consensus: 90,
            reliability: 80,
            software: 70,
            diversity: 60,
            identity: 50,
            reasoning: 'Stable validator',
          },
        ],
      },
      round: round(11),
      config: null,
      roundConfig: null,
    })

    expect(info).toEqual({ status: 'on_unl', score: null })
  })
})

describe('round state helpers', () => {
  it('normalizes legacy and final bundle CIDs', () => {
    expect(
      getRoundBundleCid({
        final_bundle_cid: 'QmFinalBundle',
        ipfs_cid: 'QmLegacyBundle',
      }),
    ).toBe('QmFinalBundle')
    expect(getRoundBundleCid({ ipfs_cid: 'QmLegacyBundle' })).toBe(
      'QmLegacyBundle',
    )
    expect(getRoundBundleCid({ final_bundle_cid: '', ipfs_cid: '' })).toBeNull()
  })

  it('normalizes the frozen input package CID', () => {
    expect(getRoundInputPackageCid({ input_package_cid: 'QmInput' })).toBe(
      'QmInput',
    )
    expect(getRoundInputPackageCid({ input_package_cid: '' })).toBeNull()
    expect(getRoundInputPackageCid({})).toBeNull()
  })

  it('identifies in-progress rounds separately from terminal rounds', () => {
    expect(classifyRoundState('COMPLETE')).toBe('complete')
    expect(classifyRoundState('FAILED')).toBe('failed')
    expect(classifyRoundState('VL_PUBLISHED_MEMO_FAILED')).toBe(
      'published_warning',
    )
    expect(classifyRoundState('ONCHAIN_PUBLISHED')).toBe('running')
    expect(isInProgressRound(round(11, 'COLLECTING'))).toBe(true)
    expect(isInProgressRound(round(12, 'ONCHAIN_PUBLISHED'))).toBe(true)
    expect(isInProgressRound(round(10, 'COMPLETE'))).toBe(false)
    expect(isInProgressRound(round(9, 'FAILED'))).toBe(false)
    expect(isInProgressRound(round(7, 'VL_PUBLISHED_MEMO_FAILED'))).toBe(false)
    expect(isInProgressRound(round(6, 'UNEXPECTED_PRIVATE_STATUS'))).toBe(true)
  })

  it('treats memo-failed VL rounds as operationally published', () => {
    expect(isOperationallyPublishedRound(round(12))).toBe(true)
    expect(
      isOperationallyPublishedRound(round(11, 'VL_PUBLISHED_MEMO_FAILED')),
    ).toBe(true)
    expect(isOperationallyPublishedRound(round(10, 'FAILED'))).toBe(false)
    expect(
      isOperationallyPublishedRound(round(9, 'UNEXPECTED_PRIVATE_STATUS')),
    ).toBe(false)
  })

  it('derives failed stages from final bundle CID as well as legacy IPFS CID', () => {
    expect(
      deriveFailedAtStage({
        ...round(16, 'FAILED'),
        snapshot_hash: 'snapshot',
        scores_hash: 'scores',
        vl_sequence: 12,
      }),
    ).toBe('IPFS_PUBLISHED')
    expect(
      deriveFailedAtStage({
        ...round(17, 'FAILED'),
        snapshot_hash: 'snapshot',
        scores_hash: 'scores',
        vl_sequence: 12,
        final_bundle_cid: 'QmFinalBundle',
      }),
    ).toBe('VL_DISTRIBUTED')
  })
})

describe('excluded scoring server versions', () => {
  it('reads excluded validator server versions from staged execution manifests', () => {
    const config = roundScoringConfigFromExecutionManifest({
      code: {
        collector: {
          parameters: {
            excluded_validator_server_versions: [' 3.0.0 ', '', '2.9.0', 4],
          },
        },
      },
    })

    expect(config).toEqual({
      excluded_validator_server_versions: ['3.0.0', '2.9.0'],
    })
    expect(getExcludedScoringServerVersion('3.0.0', config)).toBe('3.0.0')
  })

  it('falls back when staged execution manifests omit collector exclusions', () => {
    expect(roundScoringConfigFromExecutionManifest({ code: {} })).toBeNull()
    expect(roundScoringConfigFromExecutionManifest(null)).toBeNull()
  })

  it('matches excluded validator server versions exactly after trimming', () => {
    expect(
      getExcludedScoringServerVersion(' 3.0.0 ', {
        excluded_validator_server_versions: ['2.9.0', '3.0.0'],
      }),
    ).toBe('3.0.0')
  })

  it('does not match partial server versions', () => {
    expect(
      getExcludedScoringServerVersion('3.0.0-beta', {
        excluded_validator_server_versions: ['3.0.0'],
      }),
    ).toBeNull()
  })

  it('falls back when the scoring config has no usable policy', () => {
    expect(getExcludedScoringServerVersion('3.0.0', null)).toBeNull()
    expect(
      getExcludedScoringServerVersion('3.0.0', {
        excluded_validator_server_versions: undefined,
      }),
    ).toBeNull()
  })
})

describe('computeValidatorDelta', () => {
  it('keeps delta unresolved while previous scores have not loaded', () => {
    expect(
      computeValidatorDelta('validator-a', 80, 'on_unl', undefined, undefined),
    ).toEqual({ kind: 'unresolved' })
  })

  it('marks a validator as new when previous scores resolved without it', () => {
    expect(
      computeValidatorDelta(
        'validator-a',
        80,
        'on_unl',
        { validator_scores: [] },
        { unl: [], alternates: [] },
      ),
    ).toEqual({ kind: 'new' })
  })

  it('combines promoted membership movement with score movement', () => {
    expect(
      computeValidatorDelta(
        'validator-a',
        86,
        'on_unl',
        { validator_scores: [scoreEntry('validator-a', 80)] },
        { unl: [], alternates: ['validator-a'] },
      ),
    ).toEqual({ kind: 'up', value: 6, membership: 'promoted' })
  })

  it('combines displaced membership movement with score movement', () => {
    expect(
      computeValidatorDelta(
        'validator-a',
        77,
        'candidate',
        { validator_scores: [scoreEntry('validator-a', 80)] },
        { unl: ['validator-a'], alternates: [] },
      ),
    ).toEqual({ kind: 'down', value: 3, membership: 'displaced' })
  })

  it('keeps score-only movement separate from membership movement', () => {
    expect(
      computeValidatorDelta(
        'validator-a',
        86,
        'on_unl',
        { validator_scores: [scoreEntry('validator-a', 80)] },
        { unl: ['validator-a'], alternates: [] },
      ),
    ).toEqual({ kind: 'up', value: 6 })
  })

  it('returns no visible movement when score and membership are unchanged', () => {
    expect(
      computeValidatorDelta(
        'validator-a',
        80,
        'on_unl',
        { validator_scores: [scoreEntry('validator-a', 80)] },
        { unl: ['validator-a'], alternates: [] },
      ),
    ).toEqual({ kind: 'same' })
  })
})

describe('isRoundFresh', () => {
  const HOUR_MS = 60 * 60 * 1000
  const completedAt = '2026-06-01T00:00:00Z'
  const completedMs = Date.parse(completedAt)

  const freshRound = (
    overrides: Partial<ScoringRoundMeta> = {},
  ): ScoringRoundMeta => ({
    round_number: 9,
    status: 'COMPLETE',
    completed_at: completedAt,
    override_type: null,
    ...overrides,
  })

  it('is fresh inside the default 24h window when cadence is long', () => {
    expect(isRoundFresh(freshRound(), 168, completedMs + 5 * HOUR_MS)).toBe(
      true,
    )
  })

  it('becomes stale once the window elapses', () => {
    expect(isRoundFresh(freshRound(), 168, completedMs + 25 * HOUR_MS)).toBe(
      false,
    )
  })

  it('is no longer fresh exactly at the window boundary', () => {
    expect(isRoundFresh(freshRound(), 168, completedMs + 24 * HOUR_MS)).toBe(
      false,
    )
  })

  it('ignores a round whose completion is in the future (clock skew)', () => {
    expect(isRoundFresh(freshRound(), 168, completedMs - HOUR_MS)).toBe(false)
  })

  it('caps the window at the cadence so it cannot stay lit permanently', () => {
    expect(isRoundFresh(freshRound(), 6, completedMs + 5 * HOUR_MS)).toBe(true)
    expect(isRoundFresh(freshRound(), 6, completedMs + 7 * HOUR_MS)).toBe(false)
  })

  it('falls back to the 24h window when cadence is unknown', () => {
    expect(isRoundFresh(freshRound(), null, completedMs + 5 * HOUR_MS)).toBe(
      true,
    )
    expect(isRoundFresh(freshRound(), null, completedMs + 25 * HOUR_MS)).toBe(
      false,
    )
  })

  it('treats VL_PUBLISHED_MEMO_FAILED as a fresh published round', () => {
    expect(
      isRoundFresh(
        freshRound({ status: 'VL_PUBLISHED_MEMO_FAILED' }),
        168,
        completedMs + HOUR_MS,
      ),
    ).toBe(true)
  })

  it('suppresses override, failed, in-progress, and missing rounds', () => {
    const now = completedMs + HOUR_MS
    expect(
      isRoundFresh(freshRound({ override_type: 'manual' }), 168, now),
    ).toBe(false)
    expect(isRoundFresh(freshRound({ status: 'FAILED' }), 168, now)).toBe(false)
    expect(isRoundFresh(freshRound({ status: 'COLLECTING' }), 168, now)).toBe(
      false,
    )
    expect(isRoundFresh(freshRound({ completed_at: null }), 168, now)).toBe(
      false,
    )
    expect(isRoundFresh(null, 168, now)).toBe(false)
  })
})
