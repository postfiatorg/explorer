import {
  findLatestScoredRound,
  findPreviousScoredRound,
  getScoringInfoForValidator,
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
    })

    expect(info).toEqual({ status: 'on_unl', score: null })
  })
})
