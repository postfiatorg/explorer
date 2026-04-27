import { useQuery } from 'react-query'
import { ScoringRoundMeta, fetchJsonOrNull } from './scoringUtils'

const THIRTY_SECONDS_MS = 30 * 1000

export type ScoringAvailability = 'loading' | 'genesis' | 'available' | 'error'

interface LatestRoundsResponse {
  rounds: ScoringRoundMeta[]
}

export interface UseScoringAvailabilityResult {
  state: ScoringAvailability
  isFetching: boolean
  refetch: () => Promise<unknown>
}

export const useScoringAvailability = (): UseScoringAvailabilityResult => {
  const { data, isLoading, isFetching, refetch } =
    useQuery<LatestRoundsResponse | null>(
      ['scoring-rounds-latest'],
      () =>
        fetchJsonOrNull<LatestRoundsResponse>('/api/scoring/rounds?limit=1'),
      {
        staleTime: THIRTY_SECONDS_MS,
        refetchInterval: THIRTY_SECONDS_MS,
        retry: false,
      },
    )

  let state: ScoringAvailability
  if (isLoading) state = 'loading'
  else if (data == null) state = 'error'
  else if ((data.rounds ?? []).length === 0) state = 'genesis'
  else state = 'available'

  return { state, isFetching, refetch }
}
