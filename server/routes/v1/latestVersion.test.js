const axios = require('axios')
const {
  parseSemver,
  compareSemver,
  fetchLatestVersion,
  clearCache,
  NETWORK_TO_DOCKER_PREFIX,
  getLatestVersion,
} = require('./latestVersion')

jest.mock('axios')
jest.mock('../../lib/logger', () => () => ({
  error: jest.fn(),
  info: jest.fn(),
}))

const MOCK_TAGS = {
  data: {
    results: [
      { name: 'devnet-full-1.0.2' },
      { name: 'devnet-full-latest' },
      { name: 'devnet-medium-1.0.2' },
      { name: 'devnet-medium-latest' },
      { name: 'devnet-light-1.0.2' },
      { name: 'devnet-light-latest' },
      { name: 'devnet-medium-1.0.1' },
      { name: 'devnet-full-1.0.1' },
      { name: 'devnet-light-1.0.1' },
      { name: 'devnet-light-1.0.0' },
      { name: 'devnet-full-1.0.0' },
      { name: 'devnet-medium-1.0.0' },
      { name: 'testnet-full-1.0.0' },
      { name: 'testnet-full-latest' },
      { name: 'testnet-light-1.0.0' },
      { name: 'testnet-light-latest' },
      { name: 'testnet-medium-1.0.0' },
      { name: 'testnet-medium-latest' },
      { name: 'ai-devnet-full-latest' },
      { name: 'ai-devnet-light-latest' },
      { name: 'ai-devnet-medium-latest' },
    ],
  },
}

describe('parseSemver', () => {
  it('parses valid semver strings', () => {
    expect(parseSemver('1.0.2')).toEqual({ major: 1, minor: 0, patch: 2 })
    expect(parseSemver('10.20.30')).toEqual({
      major: 10,
      minor: 20,
      patch: 30,
    })
  })

  it('returns null for invalid strings', () => {
    expect(parseSemver('latest')).toBeNull()
    expect(parseSemver('abc')).toBeNull()
    expect(parseSemver('')).toBeNull()
  })
})

describe('compareSemver', () => {
  it('compares major versions', () => {
    expect(
      compareSemver(
        { major: 2, minor: 0, patch: 0 },
        { major: 1, minor: 0, patch: 0 },
      ),
    ).toBeGreaterThan(0)
  })

  it('compares minor versions', () => {
    expect(
      compareSemver(
        { major: 1, minor: 1, patch: 0 },
        { major: 1, minor: 0, patch: 0 },
      ),
    ).toBeGreaterThan(0)
  })

  it('compares patch versions', () => {
    expect(
      compareSemver(
        { major: 1, minor: 0, patch: 2 },
        { major: 1, minor: 0, patch: 1 },
      ),
    ).toBeGreaterThan(0)
  })

  it('returns 0 for equal versions', () => {
    expect(
      compareSemver(
        { major: 1, minor: 0, patch: 0 },
        { major: 1, minor: 0, patch: 0 },
      ),
    ).toBe(0)
  })
})

describe('fetchLatestVersion', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    clearCache()
  })

  it('returns the highest version for dev network', async () => {
    axios.get.mockResolvedValue(MOCK_TAGS)
    const version = await fetchLatestVersion('dev')
    expect(version).toBe('1.0.2')
  })

  it('returns the highest version for test network', async () => {
    axios.get.mockResolvedValue(MOCK_TAGS)
    const version = await fetchLatestVersion('test')
    expect(version).toBe('1.0.0')
  })

  it('ignores tags with "latest" as the version', async () => {
    axios.get.mockResolvedValue({
      data: {
        results: [
          { name: 'devnet-full-latest' },
          { name: 'devnet-medium-latest' },
        ],
      },
    })
    const version = await fetchLatestVersion('dev')
    expect(version).toBeNull()
  })

  it('ignores tags from other networks', async () => {
    axios.get.mockResolvedValue(MOCK_TAGS)
    const version = await fetchLatestVersion('dev')
    expect(version).toBe('1.0.2')
    expect(version).not.toBe('1.0.0')
  })

  it('returns cached result on subsequent calls within TTL', async () => {
    axios.get.mockResolvedValue(MOCK_TAGS)
    await fetchLatestVersion('dev')
    await fetchLatestVersion('dev')
    expect(axios.get).toHaveBeenCalledTimes(1)
  })
})

describe('getLatestVersion handler', () => {
  const mockRes = () => {
    const res = {}
    res.status = jest.fn().mockReturnValue(res)
    res.json = jest.fn().mockReturnValue(res)
    return res
  }

  beforeEach(() => {
    jest.clearAllMocks()
    clearCache()
  })

  it('returns 400 for unsupported networks', async () => {
    const res = mockRes()
    await getLatestVersion({ params: { network: 'mainnet' } }, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Unsupported network' })
  })

  it('returns version for supported network', async () => {
    axios.get.mockResolvedValue(MOCK_TAGS)
    const res = mockRes()
    await getLatestVersion({ params: { network: 'dev' } }, res)
    expect(res.json).toHaveBeenCalledWith({
      version: '1.0.2',
      network: 'dev',
    })
  })
})

describe('NETWORK_TO_DOCKER_PREFIX', () => {
  it('maps dev and test to Docker Hub tag prefixes', () => {
    expect(NETWORK_TO_DOCKER_PREFIX.dev).toBe('devnet')
    expect(NETWORK_TO_DOCKER_PREFIX.test).toBe('testnet')
  })

  it('does not include unsupported networks', () => {
    expect(NETWORK_TO_DOCKER_PREFIX.mainnet).toBeUndefined()
    expect(NETWORK_TO_DOCKER_PREFIX['ai-devnet']).toBeUndefined()
  })
})
