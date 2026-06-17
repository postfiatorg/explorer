import { FC } from 'react'
import {
  SCORING_DIMENSIONS,
  ScoringConfig,
  formatCadence,
} from '../Network/scoringUtils'

interface MethodologyExplainerProps {
  config: ScoringConfig | null
}

const DASH = '—'

export const MethodologyExplainer: FC<MethodologyExplainerProps> = ({
  config,
}) => {
  const cutoff = config?.unl_score_cutoff ?? DASH
  const maxSize = config?.unl_max_size ?? DASH
  const minGap = config?.unl_min_score_gap ?? DASH
  const cadence =
    config?.cadence_hours != null ? formatCadence(config.cadence_hours) : DASH

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
        </div>
      </details>

      <details className="methodology-section">
        <summary className="methodology-summary">
          How results are published
        </summary>
        <div className="methodology-body">
          <ol className="methodology-steps">
            <li>
              <strong>Pin artifacts to IPFS</strong> — snapshot, scores, UNL,
              signed VL, and metadata, content-addressed by CID.
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
              <strong>Anyone can reproduce</strong> — re-run scoring from the
              frozen inputs and match the published output hashes.
            </li>
            <li>
              <strong>Validators confirm on chain</strong> — they reproduce the
              round and commit-reveal their result, so agreement is provable,
              not trusted.
            </li>
          </ol>
        </div>
      </details>
    </div>
  )
}
