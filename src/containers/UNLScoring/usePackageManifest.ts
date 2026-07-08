import { useQuery } from 'react-query'
import { BundleManifest, fetchBundleManifest } from '../Network/scoringUtils'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

// Fetches a pinned package's bundle.json through the explorer's /ipfs proxy.
// The content is addressed by its CID and therefore immutable, so a long
// staleTime is safe. Resolves to null while loading and when the fetch fails;
// the consumer falls back to plain links in both cases.
export const usePackageManifest = (
  cid: string | null | undefined,
): BundleManifest | null => {
  const { data } = useQuery<BundleManifest | null>(
    ['ipfs-bundle-manifest', cid],
    () => fetchBundleManifest(cid as string),
    {
      enabled: Boolean(cid),
      staleTime: TWENTY_FOUR_HOURS_MS,
      retry: false,
    },
  )

  return data ?? null
}
