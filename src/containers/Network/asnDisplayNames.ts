// Friendly display names for Autonomous System Numbers surfaced on public
// scoring surfaces. The scoring pipeline emits raw BGP-registry strings such as
// "AS-VULTR - The Constant Company, LLC, US" via pyasn; this map translates the
// ASN number to the organization's widely recognized short name so the explorer
// drill-down stays legible without altering upstream snapshot artifacts.
//
// Each entry below was validated against PeeringDB
// (https://www.peeringdb.com/api/net?asn=<n>) before inclusion so the mapping
// reflects the provider's registered identity rather than a guess. When a
// validator's ASN is not present in this map, provider-specific aliases are
// matched against the raw registry name before the drill-down falls back to the
// raw pyasn-emitted string.
//
// Providers that operate multiple regional ASNs (Leaseweb, Tencent) are mapped
// to the same display name across all their ASNs on purpose — the distinction
// between regional edges is not useful on a public scoring page.

export const ASN_DISPLAY_NAMES: Record<number, string> = {
  8075: 'Microsoft Azure',
  8560: 'IONOS',
  9009: 'M247',
  9370: 'Sakura Internet',
  12876: 'Scaleway',
  13335: 'Cloudflare',
  14061: 'DigitalOcean',
  15169: 'Google Cloud',
  16276: 'OVHcloud',
  16509: 'AWS',
  20473: 'Vultr',
  24940: 'Hetzner',
  26347: 'DreamHost',
  30633: 'Leaseweb',
  31898: 'Oracle Cloud',
  32244: 'Liquid Web',
  36351: 'IBM Cloud',
  45090: 'Tencent Cloud',
  45102: 'Alibaba Cloud',
  47583: 'Hostinger',
  49981: 'Worldstream',
  50673: 'Serverius',
  51167: 'Contabo',
  54113: 'Fastly',
  54290: 'Hostwinds',
  54825: 'Equinix Metal',
  60781: 'Leaseweb',
  62240: 'Clouvider',
  63949: 'Linode',
  132203: 'Tencent Cloud',
  202053: 'UpCloud',
  394380: 'Leaseweb',
}

interface ASNDisplayInfo {
  asn: number
  as_name?: string | null
}

interface ProviderAlias {
  displayName: string
  normalizedAlias: string
}

const MIN_ALIAS_LENGTH = 5

const ADDITIONAL_PROVIDER_ALIASES: Record<string, string[]> = {
  'Cherry Servers': ['CherryServers'],
  HOSTKEY: [],
}

const normalizeProviderAlias = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '')

const buildProviderAliases = (): ProviderAlias[] => {
  const aliasByNormalizedValue = new Map<string, string>()

  const addProviderAlias = (displayName: string, alias: string) => {
    const normalizedAlias = normalizeProviderAlias(alias)
    if (normalizedAlias.length < MIN_ALIAS_LENGTH) return
    aliasByNormalizedValue.set(normalizedAlias, displayName)
  }

  Object.values(ASN_DISPLAY_NAMES).forEach((displayName) => {
    addProviderAlias(displayName, displayName)
  })

  Object.entries(ADDITIONAL_PROVIDER_ALIASES).forEach(
    ([displayName, aliases]) => {
      addProviderAlias(displayName, displayName)
      aliases.forEach((alias) => addProviderAlias(displayName, alias))
    },
  )

  return Array.from(
    aliasByNormalizedValue,
    ([normalizedAlias, displayName]) => ({
      displayName,
      normalizedAlias,
    }),
  ).sort((a, b) => b.normalizedAlias.length - a.normalizedAlias.length)
}

const PROVIDER_ALIASES = buildProviderAliases()

const getProviderDisplayNameFromRegistryName = (
  asName: string,
): string | null => {
  const normalizedAsName = normalizeProviderAlias(asName)
  const match = PROVIDER_ALIASES.find(({ normalizedAlias }) =>
    normalizedAsName.includes(normalizedAlias),
  )

  return match?.displayName ?? null
}

export const formatASNDisplayName = (asn: ASNDisplayInfo | null): string => {
  if (!asn) return '—'

  const friendly = ASN_DISPLAY_NAMES[asn.asn]
  if (friendly) return friendly

  const rawName = asn.as_name?.trim()
  if (!rawName) return `AS${asn.asn}`

  return getProviderDisplayNameFromRegistryName(rawName) ?? rawName
}
