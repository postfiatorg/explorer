import { useQuery } from 'react-query'
import { ScoringConfig, fetchJsonOrNull } from '../Network/scoringUtils'

const CONFIG_STALE_MS = 5 * 60 * 1000

// Reads the public scoring runtime config. Shares react-query's ['scoring-config']
// cache with useScoringContext, so mounting this alongside the scoring page adds
// no extra network request.
export const useScoringConfig = (): ScoringConfig | null => {
  const { data } = useQuery<ScoringConfig | null>(
    ['scoring-config'],
    () => fetchJsonOrNull<ScoringConfig>('/api/scoring/config'),
    { staleTime: CONFIG_STALE_MS, retry: false },
  )
  return data ?? null
}
