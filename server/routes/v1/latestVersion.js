const axios = require('axios')
const log = require('../../lib/logger')({ name: 'latestVersion' })

const DOCKER_HUB_TAGS_URL =
  'https://hub.docker.com/v2/repositories/agtipft/postfiatd/tags/'
const NETWORK_TO_DOCKER_PREFIX = {
  dev: 'devnet',
  test: 'testnet',
}
const CACHE_TTL_MS = 60 * 60 * 1000

const cache = new Map()

const parseSemver = (version) => {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) return null
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
  }
}

const compareSemver = (a, b) => {
  if (a.major !== b.major) return a.major - b.major
  if (a.minor !== b.minor) return a.minor - b.minor
  return a.patch - b.patch
}

const fetchLatestVersion = async (network) => {
  const cached = cache.get(network)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.version
  }

  const response = await axios.get(DOCKER_HUB_TAGS_URL, {
    params: { page_size: 100 },
    timeout: 10000,
  })

  const prefix = `${NETWORK_TO_DOCKER_PREFIX[network] || network}-`
  let highest = null
  let highestParsed = null

  response.data.results.forEach((tag) => {
    if (!tag.name.startsWith(prefix)) return

    const parts = tag.name.slice(prefix.length).split('-')
    if (parts.length !== 2) return

    const version = parts[1]
    if (version === 'latest') return

    const parsed = parseSemver(version)
    if (!parsed) return

    if (!highestParsed || compareSemver(parsed, highestParsed) > 0) {
      highest = version
      highestParsed = parsed
    }
  })

  if (highest) {
    cache.set(network, { version: highest, timestamp: Date.now() })
  }

  return highest
}

const getLatestVersion = async (req, res) => {
  const { network } = req.params

  if (!(network in NETWORK_TO_DOCKER_PREFIX)) {
    return res.status(400).json({ error: 'Unsupported network' })
  }

  try {
    const version = await fetchLatestVersion(network)
    if (!version) {
      return res.status(404).json({ error: 'No versions found' })
    }
    return res.json({ version, network })
  } catch (error) {
    log.error('Failed to fetch latest version from Docker Hub:', error.message)

    const cached = cache.get(network)
    if (cached) {
      return res.json({ version: cached.version, network, stale: true })
    }

    return res.status(502).json({ error: 'Failed to fetch version data' })
  }
}

const clearCache = () => cache.clear()

module.exports = {
  getLatestVersion,
  fetchLatestVersion,
  parseSemver,
  compareSemver,
  clearCache,
  NETWORK_TO_DOCKER_PREFIX,
}
