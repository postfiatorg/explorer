const express = require('express')
const axios = require('axios')
const log = require('../lib/logger')({ name: 'scoringProxy' })

const ONE_HOUR_S = 60 * 60
const TWENTY_FOUR_HOURS_S = 24 * 60 * 60
const THREE_MINUTES_S = 3 * 60
const THIRTY_SECONDS_S = 30

const REQUEST_TIMEOUT_MS = 10000
const TERMINAL_ROUND_STATUSES = new Set(['COMPLETE', 'FAILED'])

const cache = new Map()

const getTTLSeconds = (path, query, responseBody) => {
  if (path === '/config') return ONE_HOUR_S
  if (path === '/unl/current') return THREE_MINUTES_S

  if (path === '/rounds') {
    if (query && query.limit === '1') return THIRTY_SECONDS_S
    return THREE_MINUTES_S
  }

  if (/^\/rounds\/\d+$/.test(path)) {
    const status = responseBody && responseBody.status
    if (TERMINAL_ROUND_STATUSES.has(status)) return TWENTY_FOUR_HOURS_S
    return THIRTY_SECONDS_S
  }

  return THIRTY_SECONDS_S
}

const getUpstreamBase = () => {
  const raw = process.env.SCORING_SERVICE_URL
  if (!raw) return null
  return raw.replace(/\/+$/, '')
}

const scoringProxy = async (req, res) => {
  if (req.method !== 'GET') {
    res.set('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const upstreamBase = getUpstreamBase()
  if (!upstreamBase) {
    log.error('SCORING_SERVICE_URL is not configured')
    return res.status(500).json({ error: 'Scoring service URL not configured' })
  }

  const cacheKey = req.url
  const cached = cache.get(cacheKey)
  const now = Date.now()

  if (cached && now - cached.timestamp < cached.ttlMs) {
    return res.status(cached.statusCode).json(cached.data)
  }

  try {
    const upstreamUrl = `${upstreamBase}/api/scoring${req.url}`
    const response = await axios.get(upstreamUrl, {
      timeout: REQUEST_TIMEOUT_MS,
      validateStatus: () => true,
    })

    if (response.status >= 200 && response.status < 300) {
      const ttlSeconds = getTTLSeconds(req.path, req.query || {}, response.data)
      cache.set(cacheKey, {
        data: response.data,
        statusCode: response.status,
        timestamp: now,
        ttlMs: ttlSeconds * 1000,
      })
      return res.status(response.status).json(response.data)
    }

    if (response.status >= 400 && response.status < 500) {
      return res.status(response.status).json(response.data)
    }

    throw new Error(`Upstream returned ${response.status}`)
  } catch (err) {
    log.error(
      `Scoring proxy upstream failure for ${req.url}: ${err.message || err}`,
    )

    if (cached) {
      res.set('X-Scoring-Stale', 'true')
      return res.status(cached.statusCode).json(cached.data)
    }

    return res.status(502).json({ error: 'Scoring service unreachable' })
  }
}

const clearCache = () => cache.clear()

const router = express.Router()
router.use(scoringProxy)

module.exports = {
  router,
  scoringProxy,
  getTTLSeconds,
  clearCache,
  cache,
  TTL_SECONDS: {
    CONFIG: ONE_HOUR_S,
    UNL_CURRENT: THREE_MINUTES_S,
    ROUNDS_LIST_LIMIT_1: THIRTY_SECONDS_S,
    ROUNDS_LIST_DEFAULT: THREE_MINUTES_S,
    ROUND_TERMINAL: TWENTY_FOUR_HOURS_S,
    ROUND_NON_TERMINAL: THIRTY_SECONDS_S,
    DEFAULT: THIRTY_SECONDS_S,
  },
}
