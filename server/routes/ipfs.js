const express = require('express')
const axios = require('axios')
const log = require('../lib/logger')({ name: 'ipfsProxy' })

const REQUEST_TIMEOUT_MS = 20000
const ONE_DAY_S = 24 * 60 * 60

// IPFS content is addressed by its CID and therefore immutable, so a successful
// file or directory listing is safe for the browser and any CDN to cache hard.
const IMMUTABLE_CACHE_CONTROL = `public, max-age=${ONE_DAY_S}, immutable`

// Only the first path segment is constrained — it must look like an IPFS CID
// (v0 `Qm…` base58 or v1 base32). This keeps the route from acting as an open
// proxy that would attach the gateway access token to arbitrary hosts or paths;
// everything below the CID — the bundle's own files — is forwarded as-is.
const CID_SEGMENT = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|[bB][A-Za-z2-7]{58,})$/

// Upstream response headers worth passing back. Anything else (cookies, CORS
// rules, server fingerprints) is dropped.
const FORWARDED_HEADERS = [
  'content-type',
  'content-length',
  'content-disposition',
  'last-modified',
  'etag',
]

const getGatewayHost = () => {
  const raw = process.env.IPFS_GATEWAY_HOST
  if (!raw) return null
  return raw.replace(/^https?:\/\//, '').replace(/\/+$/, '')
}

const isValidCidPath = (urlPath) => {
  const firstSegment = urlPath.replace(/^\/+/, '').split('/')[0]
  return CID_SEGMENT.test(firstSegment)
}

const ipfsProxy = async (req, res) => {
  if (req.method !== 'GET') {
    res.set('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const host = getGatewayHost()
  if (!host) {
    log.error('IPFS_GATEWAY_HOST is not configured')
    return res.status(503).json({ error: 'IPFS gateway not configured' })
  }

  if (!isValidCidPath(req.path)) {
    return res.status(400).json({ error: 'Invalid IPFS path' })
  }

  // The dedicated gateway only honors its access token as a request header, so
  // it must be injected here server-side: a plain browser link cannot send a
  // custom header, which is the reason this proxy exists. The token stays on the
  // server and never reaches the client.
  const token = process.env.IPFS_GATEWAY_TOKEN
  const headers = token ? { 'x-pinata-gateway-token': token } : {}

  try {
    const upstreamUrl = `https://${host}/ipfs${req.url}`
    const response = await axios.get(upstreamUrl, {
      headers,
      timeout: REQUEST_TIMEOUT_MS,
      responseType: 'stream',
      // The gateway answers a bare directory CID with a path→trailing-slash 301,
      // so a single hop is all that is ever needed; cap redirects low.
      maxRedirects: 2,
      // The access token must never leave the configured gateway host.
      // follow-redirects does not strip custom headers on a cross-host hop, so
      // reject any redirect whose target host differs.
      beforeRedirect: (options) => {
        if (options.hostname !== host) {
          throw new Error(`Cross-host redirect blocked: ${options.hostname}`)
        }
      },
      // Return 3xx/4xx instead of throwing so they can be forwarded as-is; a 5xx
      // is converted to 502 below.
      validateStatus: () => true,
    })

    if (response.status >= 500) {
      throw new Error(`Upstream returned ${response.status}`)
    }

    FORWARDED_HEADERS.forEach((name) => {
      const value = response.headers[name]
      if (value) res.set(name, value)
    })
    if (response.status >= 200 && response.status < 300) {
      res.set('Cache-Control', IMMUTABLE_CACHE_CONTROL)
    }

    // A mid-stream upstream failure arrives after headers are sent, so it cannot
    // be turned into a clean status code — surface it by destroying the
    // response. Tear the upstream socket down too if the client disconnects.
    res.on('close', () => response.data.destroy())
    response.data.on('error', (streamErr) => {
      log.error(
        `IPFS proxy stream error for ${req.url}: ${streamErr.message || streamErr}`,
      )
      res.destroy(streamErr)
    })

    res.status(response.status)
    return response.data.pipe(res)
  } catch (err) {
    log.error(
      `IPFS proxy upstream failure for ${req.url}: ${err.message || err}`,
    )
    return res.status(502).json({ error: 'IPFS gateway unreachable' })
  }
}

const router = express.Router()
router.use(ipfsProxy)

module.exports = { router, ipfsProxy, isValidCidPath, getGatewayHost }
