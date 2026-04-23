// Friendly display names for Autonomous System Numbers surfaced on public
// scoring surfaces. The scoring pipeline emits raw BGP-registry strings such as
// "AS-VULTR - The Constant Company, LLC, US" via pyasn; this map translates the
// ASN number to the organization's widely recognized short name so the explorer
// drill-down stays legible without altering upstream snapshot artifacts.
//
// Each entry below was validated against PeeringDB
// (https://www.peeringdb.com/api/net?asn=<n>) before inclusion so the mapping
// reflects the provider's registered identity rather than a guess. When a
// validator's ASN is not present in this map, the drill-down falls back to the
// raw pyasn-emitted string prefixed with the AS number.
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
