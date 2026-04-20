const axios = require('axios')

jest.mock('axios')
jest.mock('../lib/logger', () => () => ({
  error: jest.fn(),
  info: jest.fn(),
}))

const {
  scoringProxy,
  getTTLSeconds,
  clearCache,
  cache,
  TTL_SECONDS,
} = require('./scoring')

const UPSTREAM = 'https://scoring-test.postfiat.org'
const ONE_HOUR_MS = 60 * 60 * 1000

const parseQuery = (qs) => {
  const out = {}
  if (!qs) return out
  qs.split('&').forEach((pair) => {
    const [k, v] = pair.split('=')
    if (k) out[decodeURIComponent(k)] = v ? decodeURIComponent(v) : ''
  })
  return out
}

const mockReq = ({
  method = 'GET',
  url = '/config',
  path = null,
  query = null,
} = {}) => {
  const [rawPath, rawQs] = url.split('?')
  const resolvedPath = path != null ? path : rawPath
  const resolvedQuery = query != null ? query : parseQuery(rawQs)
  return {
    method,
    url,
    path: resolvedPath,
    query: resolvedQuery,
  }
}

const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.set = jest.fn().mockReturnValue(res)
  return res
}

const previousEnv = process.env.SCORING_SERVICE_URL

beforeEach(() => {
  jest.clearAllMocks()
  clearCache()
  process.env.SCORING_SERVICE_URL = UPSTREAM
})

afterAll(() => {
  if (previousEnv === undefined) {
    delete process.env.SCORING_SERVICE_URL
  } else {
    process.env.SCORING_SERVICE_URL = previousEnv
  }
})

// ---------------------------------------------------------------------------
// getTTLSeconds — per-endpoint + response-aware policy
// ---------------------------------------------------------------------------

describe('getTTLSeconds', () => {
  it('caches /config for 1 hour', () => {
    expect(getTTLSeconds('/config', {}, {})).toBe(TTL_SECONDS.CONFIG)
  })

  it('caches /unl/current for a few minutes', () => {
    expect(getTTLSeconds('/unl/current', {}, {})).toBe(TTL_SECONDS.UNL_CURRENT)
  })

  it('caches /rounds?limit=1 for 30 seconds', () => {
    expect(getTTLSeconds('/rounds', { limit: '1' }, {})).toBe(
      TTL_SECONDS.ROUNDS_LIST_LIMIT_1,
    )
  })

  it('caches /rounds with other limits for a few minutes', () => {
    expect(getTTLSeconds('/rounds', { limit: '20' }, {})).toBe(
      TTL_SECONDS.ROUNDS_LIST_DEFAULT,
    )
    expect(getTTLSeconds('/rounds', {}, {})).toBe(
      TTL_SECONDS.ROUNDS_LIST_DEFAULT,
    )
  })

  it('caches /rounds/{id} with status=COMPLETE for 24 hours', () => {
    expect(getTTLSeconds('/rounds/14', {}, { status: 'COMPLETE' })).toBe(
      TTL_SECONDS.ROUND_TERMINAL,
    )
  })

  it('caches /rounds/{id} with status=FAILED for 24 hours', () => {
    expect(getTTLSeconds('/rounds/15', {}, { status: 'FAILED' })).toBe(
      TTL_SECONDS.ROUND_TERMINAL,
    )
  })

  it('caches /rounds/{id} in a non-terminal state for 30 seconds', () => {
    expect(getTTLSeconds('/rounds/15', {}, { status: 'COLLECTING' })).toBe(
      TTL_SECONDS.ROUND_NON_TERMINAL,
    )
    expect(getTTLSeconds('/rounds/15', {}, { status: 'SCORED' })).toBe(
      TTL_SECONDS.ROUND_NON_TERMINAL,
    )
    expect(getTTLSeconds('/rounds/15', {}, {})).toBe(
      TTL_SECONDS.ROUND_NON_TERMINAL,
    )
  })

  it('defaults to 30 seconds for unlisted paths', () => {
    expect(getTTLSeconds('/rounds/14/vl.json', {}, {})).toBe(
      TTL_SECONDS.DEFAULT,
    )
    expect(getTTLSeconds('/unknown/path', {}, {})).toBe(TTL_SECONDS.DEFAULT)
  })
})

// ---------------------------------------------------------------------------
// HTTP method handling
// ---------------------------------------------------------------------------

describe('scoringProxy — HTTP method handling', () => {
  const nonGetMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

  nonGetMethods.forEach((method) => {
    it(`returns 405 for ${method}`, async () => {
      const req = mockReq({ method, url: '/config' })
      const res = mockRes()

      await scoringProxy(req, res)

      expect(res.set).toHaveBeenCalledWith('Allow', 'GET')
      expect(res.status).toHaveBeenCalledWith(405)
      expect(axios.get).not.toHaveBeenCalled()
    })
  })
})

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

describe('scoringProxy — configuration', () => {
  it('returns 500 when SCORING_SERVICE_URL is not set', async () => {
    delete process.env.SCORING_SERVICE_URL
    const req = mockReq({ url: '/config' })
    const res = mockRes()

    await scoringProxy(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('trims trailing slashes from SCORING_SERVICE_URL', async () => {
    process.env.SCORING_SERVICE_URL = `${UPSTREAM}///`
    axios.get.mockResolvedValue({ status: 200, data: { ok: true } })

    await scoringProxy(mockReq({ url: '/config' }), mockRes())

    expect(axios.get).toHaveBeenCalledWith(
      `${UPSTREAM}/api/scoring/config`,
      expect.any(Object),
    )
  })
})

// ---------------------------------------------------------------------------
// Cache behavior
// ---------------------------------------------------------------------------

describe('scoringProxy — cache hits', () => {
  it('within-TTL hit bypasses upstream', async () => {
    axios.get.mockResolvedValue({
      status: 200,
      data: { cadence_hours: 168 },
    })

    await scoringProxy(mockReq({ url: '/config' }), mockRes())
    await scoringProxy(mockReq({ url: '/config' }), mockRes())

    expect(axios.get).toHaveBeenCalledTimes(1)
  })

  it('caches and forwards 2xx responses', async () => {
    axios.get.mockResolvedValue({
      status: 200,
      data: { cadence_hours: 168 },
    })
    const res = mockRes()

    await scoringProxy(mockReq({ url: '/config' }), res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({ cadence_hours: 168 })
    expect(cache.has('/config')).toBe(true)
  })

  it('does not cache 4xx responses', async () => {
    axios.get.mockResolvedValue({
      status: 404,
      data: { error: 'Round 999 not found' },
    })
    const res = mockRes()

    await scoringProxy(
      mockReq({ url: '/rounds/999', path: '/rounds/999' }),
      res,
    )

    expect(res.status).toHaveBeenCalledWith(404)
    expect(cache.has('/rounds/999')).toBe(false)
  })
})

describe('scoringProxy — TTL expiry', () => {
  it('refetches from upstream after TTL has elapsed', async () => {
    axios.get.mockResolvedValue({
      status: 200,
      data: { cadence_hours: 168 },
    })

    const now = 1_700_000_000_000
    const dateSpy = jest.spyOn(Date, 'now')

    dateSpy.mockReturnValue(now)
    await scoringProxy(mockReq({ url: '/config' }), mockRes())
    expect(axios.get).toHaveBeenCalledTimes(1)

    // 30 minutes later — still within 1h config TTL
    dateSpy.mockReturnValue(now + 30 * 60 * 1000)
    await scoringProxy(mockReq({ url: '/config' }), mockRes())
    expect(axios.get).toHaveBeenCalledTimes(1)

    // 1h + 1s later — past TTL, refetch
    dateSpy.mockReturnValue(now + (ONE_HOUR_MS + 1000))
    await scoringProxy(mockReq({ url: '/config' }), mockRes())
    expect(axios.get).toHaveBeenCalledTimes(2)

    dateSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Upstream failure — warm cache
// ---------------------------------------------------------------------------

describe('scoringProxy — upstream failure with warm cache', () => {
  it('serves stale with X-Scoring-Stale header on upstream 5xx', async () => {
    const now = 1_700_000_000_000
    const dateSpy = jest.spyOn(Date, 'now')

    dateSpy.mockReturnValue(now)
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { cadence_hours: 168 },
    })
    await scoringProxy(mockReq({ url: '/config' }), mockRes())

    // TTL expired; upstream now fails with 503
    dateSpy.mockReturnValue(now + ONE_HOUR_MS + 10_000)
    axios.get.mockResolvedValueOnce({ status: 503, data: {} })

    const staleRes = mockRes()
    await scoringProxy(mockReq({ url: '/config' }), staleRes)

    expect(staleRes.set).toHaveBeenCalledWith('X-Scoring-Stale', 'true')
    expect(staleRes.status).toHaveBeenCalledWith(200)
    expect(staleRes.json).toHaveBeenCalledWith({ cadence_hours: 168 })

    dateSpy.mockRestore()
  })

  it('serves stale with X-Scoring-Stale header on network error', async () => {
    const now = 1_700_000_000_000
    const dateSpy = jest.spyOn(Date, 'now')

    dateSpy.mockReturnValue(now)
    axios.get.mockResolvedValueOnce({
      status: 200,
      data: { cadence_hours: 168 },
    })
    await scoringProxy(mockReq({ url: '/config' }), mockRes())

    dateSpy.mockReturnValue(now + ONE_HOUR_MS + 10_000)
    axios.get.mockRejectedValueOnce(new Error('ECONNREFUSED'))

    const staleRes = mockRes()
    await scoringProxy(mockReq({ url: '/config' }), staleRes)

    expect(staleRes.set).toHaveBeenCalledWith('X-Scoring-Stale', 'true')
    expect(staleRes.status).toHaveBeenCalledWith(200)
    expect(staleRes.json).toHaveBeenCalledWith({ cadence_hours: 168 })

    dateSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Upstream failure — cold cache
// ---------------------------------------------------------------------------

describe('scoringProxy — upstream failure with cold cache', () => {
  it('returns 502 on network error', async () => {
    axios.get.mockRejectedValue(new Error('ECONNREFUSED'))
    const res = mockRes()

    await scoringProxy(mockReq({ url: '/config' }), res)

    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.set).not.toHaveBeenCalledWith('X-Scoring-Stale', 'true')
  })

  it('returns 502 on upstream 5xx with no cache', async () => {
    axios.get.mockResolvedValue({ status: 500, data: {} })
    const res = mockRes()

    await scoringProxy(mockReq({ url: '/config' }), res)

    expect(res.status).toHaveBeenCalledWith(502)
  })
})

// ---------------------------------------------------------------------------
// Cache keying by URL + query string
// ---------------------------------------------------------------------------

describe('scoringProxy — cache keying', () => {
  it('different query strings get separate cache entries', async () => {
    axios.get.mockResolvedValue({ status: 200, data: { rounds: [] } })

    await scoringProxy(
      mockReq({
        url: '/rounds?limit=1',
        path: '/rounds',
        query: { limit: '1' },
      }),
      mockRes(),
    )
    await scoringProxy(
      mockReq({
        url: '/rounds?limit=20',
        path: '/rounds',
        query: { limit: '20' },
      }),
      mockRes(),
    )

    expect(axios.get).toHaveBeenCalledTimes(2)
    expect(cache.has('/rounds?limit=1')).toBe(true)
    expect(cache.has('/rounds?limit=20')).toBe(true)
  })

  it('same URL+query shares a cache entry', async () => {
    axios.get.mockResolvedValue({ status: 200, data: { rounds: [] } })

    await scoringProxy(
      mockReq({
        url: '/rounds?limit=20',
        path: '/rounds',
        query: { limit: '20' },
      }),
      mockRes(),
    )
    await scoringProxy(
      mockReq({
        url: '/rounds?limit=20',
        path: '/rounds',
        query: { limit: '20' },
      }),
      mockRes(),
    )

    expect(axios.get).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// Per-endpoint TTL integration
// ---------------------------------------------------------------------------

describe('scoringProxy — per-endpoint TTL integration', () => {
  it('stores the configured TTL for each endpoint', async () => {
    axios.get.mockResolvedValue({ status: 200, data: {} })

    await scoringProxy(mockReq({ url: '/config' }), mockRes())
    expect(cache.get('/config').ttlMs).toBe(TTL_SECONDS.CONFIG * 1000)

    await scoringProxy(
      mockReq({
        url: '/rounds?limit=1',
        path: '/rounds',
        query: { limit: '1' },
      }),
      mockRes(),
    )
    expect(cache.get('/rounds?limit=1').ttlMs).toBe(
      TTL_SECONDS.ROUNDS_LIST_LIMIT_1 * 1000,
    )

    await scoringProxy(
      mockReq({ url: '/unl/current', path: '/unl/current' }),
      mockRes(),
    )
    expect(cache.get('/unl/current').ttlMs).toBe(TTL_SECONDS.UNL_CURRENT * 1000)
  })

  it('response-aware TTL caches COMPLETE rounds long', async () => {
    axios.get.mockResolvedValue({
      status: 200,
      data: { round_number: 14, status: 'COMPLETE' },
    })

    await scoringProxy(
      mockReq({ url: '/rounds/14', path: '/rounds/14' }),
      mockRes(),
    )

    expect(cache.get('/rounds/14').ttlMs).toBe(
      TTL_SECONDS.ROUND_TERMINAL * 1000,
    )
  })

  it('response-aware TTL caches non-terminal rounds short', async () => {
    axios.get.mockResolvedValue({
      status: 200,
      data: { round_number: 15, status: 'COLLECTING' },
    })

    await scoringProxy(
      mockReq({ url: '/rounds/15', path: '/rounds/15' }),
      mockRes(),
    )

    expect(cache.get('/rounds/15').ttlMs).toBe(
      TTL_SECONDS.ROUND_NON_TERMINAL * 1000,
    )
  })
})
