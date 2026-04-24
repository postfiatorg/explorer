import { FC } from 'react'
import { ScoringConfig, formatCadence } from '../Network/scoringUtils'

interface MethodologyExplainerProps {
  config: ScoringConfig
}

export const MethodologyExplainer: FC<MethodologyExplainerProps> = ({
  config,
}) => {
  const cadence = formatCadence(config.cadence_hours)

  return (
    <div className="methodology dashboard-panel">
      <details className="methodology-section">
        <summary className="methodology-summary">How scoring works</summary>
        <div className="methodology-body">
          <p>
            Validators are scored 0–100 by an open-weight LLM across 5
            dimensions: Consensus, Reliability, Software, Diversity, Identity.
          </p>
          <p>
            A validator must score at or above the eligibility cutoff (currently{' '}
            {config.unl_score_cutoff}) to qualify. The top {config.unl_max_size}{' '}
            qualifying validators are placed on the UNL for the coming round.
          </p>
          <p>
            To prevent churn, a challenger must score at least{' '}
            {config.unl_min_score_gap} points higher than the weakest incumbent
            to displace it.
          </p>
          <p>
            Scoring runs {cadence}. Each round produces auditable artifacts
            (snapshot, scores, UNL, signed VL, metadata) pinned to IPFS and
            anchored on-chain.
          </p>
        </div>
      </details>

      <details className="methodology-section">
        <summary className="methodology-summary">How to verify</summary>
        <div className="methodology-body">
          <p>
            Every round produces a content-addressed bundle on IPFS (shown in
            the Audit Trail panel above). The on-chain memo transaction includes
            the IPFS CID and VL sequence, so the chain is:
          </p>
          <p className="methodology-chain">
            on-chain memo → IPFS CID → signed VL → validators load and use it
          </p>
          <p>
            Since the IPFS CID is a content hash, any tampering with the
            published artifacts changes the CID, which then mismatches the memo
            — making tampering detectable by anyone who can read the memo and
            the IPFS bundle.
          </p>
        </div>
      </details>
    </div>
  )
}
