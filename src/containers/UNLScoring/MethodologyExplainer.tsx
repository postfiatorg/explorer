import { FC } from 'react'
import {
  RoundScoringConfig,
  SCORING_DIMENSIONS,
  ScoringConfig,
  formatCadence,
} from '../Network/scoringUtils'

interface MethodologyExplainerProps {
  config: ScoringConfig | null
  // The latest scored round's manifest-derived policy; the computed-diversity
  // explanation renders only when it pins the formula, since earlier rounds
  // show the model's diversity.
  roundConfig: RoundScoringConfig | null
}

const DASH = '—'

export const MethodologyExplainer: FC<MethodologyExplainerProps> = ({
  config,
  roundConfig,
}) => {
  const cutoff = config?.unl_score_cutoff ?? DASH
  const maxSize = config?.unl_max_size ?? DASH
  const minGap = config?.unl_min_score_gap ?? DASH
  const cadence =
    config?.cadence_hours != null ? formatCadence(config.cadence_hours) : DASH

  const formula = config?.score_formula ?? null
  const formulaWeights = formula
    ? SCORING_DIMENSIONS.filter(
        (dimension) => formula.weights[dimension.key] != null,
      )
        .map(
          (dimension) =>
            `${dimension.label} ${formula.weights[dimension.key]}%`,
        )
        .join(', ')
    : ''
  const diversityFormula = roundConfig?.diversity_formula ?? null

  const stats = [
    {
      label: 'Eligibility cutoff',
      value: cutoff,
      desc: 'Minimum score to qualify for the UNL',
    },
    {
      label: 'Max UNL size',
      value: maxSize,
      desc: 'Validators chosen each round',
    },
    {
      label: 'Churn gap',
      value: minGap,
      desc: 'Margin a challenger must beat an incumbent by',
    },
    { label: 'Cadence', value: cadence, desc: 'How often scoring runs' },
  ]

  return (
    <div className="methodology dashboard-panel">
      <details className="methodology-section">
        <summary className="methodology-summary">How scoring works</summary>
        <div className="methodology-body">
          <div className="methodology-stats">
            {stats.map((stat) => (
              <div className="methodology-stat" key={stat.label}>
                <span className="methodology-stat-k">{stat.label}</span>
                <span className="methodology-stat-v">{stat.value}</span>
                <span className="methodology-stat-desc">{stat.desc}</span>
              </div>
            ))}
          </div>
          <p className="methodology-lead">
            An open-weight LLM scores every validator 0–100 across five
            dimensions:
          </p>
          {SCORING_DIMENSIONS.map((dimension) => (
            <div className="methodology-dim" key={dimension.key}>
              <span className="methodology-dim-name">{dimension.label}</span>
              <span className="methodology-dim-desc">{dimension.summary}</span>
            </div>
          ))}
          {formula && formulaWeights && (
            <p className="methodology-formula">
              The final score is deterministic: a published weighted sum of the
              five sub-scores ({formulaWeights}), capped at the consensus
              sub-score plus {formula.consensus_gate_margin}. The model&apos;s
              judgment lives entirely in the sub-scores; anyone can recompute
              every final score from the round&apos;s published artifacts.
            </p>
          )}
          {diversityFormula && (
            <>
              <p className="methodology-diversity">
                Diversity is the exception: a published formula computes it from
                two counts — how many validators in the round share the
                validator&apos;s country, and how many share its hosting
                provider family. Both counts are relative to the validators
                present in the round, so the value moves when that set changes,
                and a validator whose location is unknown gets a fixed value.
              </p>
              <p className="methodology-diversity-formula">
                Diversity formula v{diversityFormula.version}: each of the two
                counts is worth up to {diversityFormula.axis_points} points,
                shrinks in proportion to how many other validators share it
                (reaching 0 well before everyone does), and is worth a fixed{' '}
                {diversityFormula.unknown_axis_points} points when unknown.
              </p>
            </>
          )}
        </div>
      </details>

      <details className="methodology-section">
        <summary className="methodology-summary">
          How results are published
        </summary>
        <div className="methodology-body">
          <ol className="methodology-steps">
            <li>
              <strong>Pin final artifacts to IPFS</strong> — after the commit
              window closes, snapshot, scores, UNL, signed VL, and metadata are
              published by CID.
            </li>
            <li>
              <strong>Anchor on chain</strong> — an on-chain memo records the
              CID and VL sequence.
            </li>
            <li>
              <strong>Tamper-evident</strong> — altering any artifact changes
              the CID, which then mismatches the memo.
            </li>
          </ol>
        </div>
      </details>

      <details className="methodology-section">
        <summary className="methodology-summary">
          How it&apos;s independently verified
        </summary>
        <div className="methodology-body">
          <ol className="methodology-steps">
            <li>
              <strong>Inputs frozen first</strong> — the exact inputs are pinned
              before scoring runs, so the round is reproducible.
            </li>
            <li>
              <strong>Outputs held through commit close</strong> — validators
              commit before final output hashes are published.
            </li>
            <li>
              <strong>Validators commit-reveal on chain</strong> — after
              publication, reveals are checked against the frozen round
              announcement and the foundation output hashes.
            </li>
          </ol>
        </div>
      </details>
    </div>
  )
}
