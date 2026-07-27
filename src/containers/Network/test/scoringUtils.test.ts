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
  isHeldRound,
  isInProgressRound,
  isOperationallyPublishedRound,
  isRoundFresh,
  isScoredRound,
  roundScoringConfigFromExecutionManifest,
  SCORING_DIMENSIONS,
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

  it('identifies held rounds by their frozen input package', () => {
    const held = {
      ...round(13, 'AWAITING_COMMIT_CLOSE'),
      input_package_cid: 'QmInputPackage',
    }
    expect(isHeldRound(held)).toBe(true)
    // frozen inputs on any in-flight stage make the round held
    expect(
      isHeldRound({ ...round(13, 'SCORED'), input_package_cid: 'QmInput' }),
    ).toBe(true)
    // pre-freeze rounds and terminal rounds are not held
    expect(isHeldRound(round(13, 'AWAITING_COMMIT_CLOSE'))).toBe(false)
    expect(isHeldRound(round(11, 'COLLECTING'))).toBe(false)
    expect(
      isHeldRound({ ...round(12, 'COMPLETE'), input_package_cid: 'QmInput' }),
    ).toBe(false)
    // once the final bundle publishes, the in-flight round is no longer held
    expect(
      isHeldRound({
        ...round(13, 'IPFS_PUBLISHED'),
        input_package_cid: 'QmInput',
        final_bundle_cid: 'QmFinalBundle',
      }),
    ).toBe(false)
    expect(
      isHeldRound({
        ...round(13, 'ONCHAIN_PUBLISHED'),
        input_package_cid: 'QmInput',
        ipfs_cid: 'QmLegacyBundle',
      }),
    ).toBe(false)
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

  it('reads the failed stage from the error message prefix', () => {
    expect(
      deriveFailedAtStage({
        ...round(16, 'FAILED'),
        error_message: 'IPFS_PUBLISHED: pinning returned no CID',
      }),
    ).toBe('IPFS_PUBLISHED')
    // The body may carry further colons; only the leading token is the stage.
    expect(
      deriveFailedAtStage({
        ...round(17, 'FAILED'),
        error_message: 'SCORED: modal-http: internal error: terminated',
      }),
    ).toBe('SCORED')
  })

  it('reads the stage of rounds that skip stages or fail between them', () => {
    // A manual override skips collecting, scoring and selection, so it never
    // holds the artifacts the old inference read.
    expect(
      deriveFailedAtStage({
        ...round(18, 'FAILED'),
        override_type: 'custom',
        snapshot_hash: null,
        scores_hash: null,
        error_message: 'VL_SIGNED: Missing manifest for validator nHB',
      }),
    ).toBe('VL_SIGNED')
    // Freezing the input package happens after the snapshot is stored.
    expect(
      deriveFailedAtStage({
        ...round(19, 'FAILED'),
        snapshot_hash: 'snapshot',
        scores_hash: null,
        error_message:
          'INPUT_FROZEN: Input package IPFS pinning returned no CID',
      }),
    ).toBe('INPUT_FROZEN')
  })

  it('reports no stage when the message does not identify one', () => {
    // A restart-abandoned round never recorded a stage.
    expect(
      deriveFailedAtStage({
        ...round(20, 'FAILED'),
        snapshot_hash: 'snapshot',
        error_message: 'Round abandoned — service restarted',
      }),
    ).toBeNull()
    expect(
      deriveFailedAtStage({ ...round(21, 'FAILED'), error_message: undefined }),
    ).toBeNull()
    // Upper-case leading text that is not a pipeline stage is not a stage.
    expect(
      deriveFailedAtStage({
        ...round(22, 'FAILED'),
        error_message: 'ERROR: something went wrong',
      }),
    ).toBeNull()
    // A prefix must lead the message and be followed by whitespace.
    expect(
      deriveFailedAtStage({
        ...round(23, 'FAILED'),
        error_message: 'retry after SCORED: modal timeout',
      }),
    ).toBeNull()
    expect(
      deriveFailedAtStage({
        ...round(24, 'FAILED'),
        error_message: 'SCORED:no space after the colon',
      }),
    ).toBeNull()
  })

  it('reports no stage for rounds that did not fail', () => {
    expect(
      deriveFailedAtStage({
        ...round(25, 'COMPLETE'),
        error_message: 'SCORED: stale message from an earlier attempt',
      }),
    ).toBeNull()
    expect(deriveFailedAtStage(round(26, 'AWAITING_COMMIT_CLOSE'))).toBeNull()
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

describe('scoring dimensions metadata', () => {
  it('gives every dimension a label, tooltip, and concise summary', () => {
    expect(SCORING_DIMENSIONS).toHaveLength(5)
    SCORING_DIMENSIONS.forEach((dimension) => {
      expect(dimension.label.length).toBeGreaterThan(0)
      expect(dimension.tooltip.length).toBeGreaterThan(0)
      expect(dimension.summary.length).toBeGreaterThan(0)
    })
  })
})
