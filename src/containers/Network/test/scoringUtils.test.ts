import {
  computeValidatorDelta,
  findLatestScoredRound,
  findPreviousScoredRound,
  getExcludedScoringServerVersion,
  getScoringInfoForValidator,
  isInProgressRound,
  isScoredRound,
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
    expect(isScoredRound(round(8, 'FAILED'))).toBe(false)
  })

  it('finds the latest completed non-override scored round', () => {
    expect(
      findLatestScoredRound([
        round(10, 'COMPLETE', 'custom'),
        round(9),
        round(8, 'FAILED'),
        round(7),
      ])?.round_number,
    ).toBe(9)
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
  it('identifies in-progress rounds separately from terminal rounds', () => {
    expect(isInProgressRound(round(11, 'COLLECTING'))).toBe(true)
    expect(isInProgressRound(round(10, 'COMPLETE'))).toBe(false)
    expect(isInProgressRound(round(9, 'FAILED'))).toBe(false)
    expect(isInProgressRound(round(8, 'DRY_RUN_COMPLETE'))).toBe(false)
  })
})

describe('excluded scoring server versions', () => {
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
