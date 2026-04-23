import axios from 'axios'
import { useQuery } from 'react-query'
import { ScoringRoundMeta } from '../Network/scoringUtils'

const THIRTY_SECONDS_MS = 30 * 1000

const RECENT_ROUNDS_LIMIT = 15

interface RecentRoundsResponse {
  rounds: ScoringRoundMeta[]
}

const fetchJsonOrNull = async <T>(url: string): Promise<T | null> => {
  try {
    const resp = await axios.get<T>(url)
    return resp.data
  } catch {
    return null
  }
}

/**
 * Recent-rounds list used by the round navigation strip on the UNL Scoring page.
 * Returned newest-first (as the backend orders them).
 */
export const useRecentRounds = (): ScoringRoundMeta[] => {
  const { data } = useQuery<RecentRoundsResponse | null>(
    ['scoring-rounds-recent', RECENT_ROUNDS_LIMIT],
    () =>
      fetchJsonOrNull<RecentRoundsResponse>(
        `/api/scoring/rounds?limit=${RECENT_ROUNDS_LIMIT}`,
      ),
    {
      staleTime: THIRTY_SECONDS_MS,
      refetchInterval: THIRTY_SECONDS_MS,
      retry: false,
    },
  )

  return data?.rounds ?? []
}
