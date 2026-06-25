const axios = require('axios')

jest.mock('axios')
jest.mock('../lib/logger', () => () => ({
  error: jest.fn(),
  info: jest.fn(),
}))

const { ipfsProxy, isValidCidPath, getGatewayHost } = require('./ipfs')

const HOST = 'gw.example.cloud'
const TOKEN = 'test-token'
const CID = 'QmSUkCoQosPbULkXsJqP7FFMsNcv44VnXB3NS16i5LZjqQ'

const mockReq = ({ method = 'GET', url = `/${CID}`, path = null } = {}) => {
  const [rawPath] = url.split('?')
  return { method, url, path: path != null ? path : rawPath }
}

const mockRes = () => {
  const res = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  res.set = jest.fn().mockReturnValue(res)
  res.on = jest.fn().mockReturnValue(res)
  res.destroy = jest.fn().mockReturnValue(res)
  return res
}

const streamResponse = (overrides = {}) => ({
  status: 200,
  headers: { 'content-type': 'application/json' },
  data: { pipe: jest.fn(), on: jest.fn(), destroy: jest.fn() },
  ...overrides,
})

const previousHost = process.env.IPFS_GATEWAY_HOST
const previousToken = process.env.IPFS_GATEWAY_TOKEN

beforeEach(() => {
  jest.clearAllMocks()
  process.env.IPFS_GATEWAY_HOST = HOST
  delete process.env.IPFS_GATEWAY_TOKEN
})

afterAll(() => {
  if (previousHost === undefined) delete process.env.IPFS_GATEWAY_HOST
  else process.env.IPFS_GATEWAY_HOST = previousHost
  if (previousToken === undefined) delete process.env.IPFS_GATEWAY_TOKEN
  else process.env.IPFS_GATEWAY_TOKEN = previousToken
})

// ---------------------------------------------------------------------------
// CID path validation
// ---------------------------------------------------------------------------

describe('isValidCidPath', () => {
  it('accepts a v0 CID and nested bundle files', () => {
    expect(isValidCidPath(`/${CID}`)).toBe(true)
    expect(isValidCidPath(`/${CID}/outputs/validator_scores.json`)).toBe(true)
  })

  it('accepts a v1 base32 CID', () => {
    expect(
      isValidCidPath(
        '/bafybeig5nqh5iik5jazmxr7rjhthkbgzcjq6zx4huarbwhz3btzz6cgyty',
      ),
    ).toBe(true)
  })

  it('rejects non-CID paths and traversal attempts', () => {
    expect(isValidCidPath('/')).toBe(false)
    expect(isValidCidPath('/etc/passwd')).toBe(false)
    expect(isValidCidPath('/not-a-cid')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

describe('getGatewayHost', () => {
  it('strips scheme and trailing slashes', () => {
    process.env.IPFS_GATEWAY_HOST = 'https://gw.example.cloud//'
    expect(getGatewayHost()).toBe('gw.example.cloud')
  })

  it('returns null when unset', () => {
    delete process.env.IPFS_GATEWAY_HOST
    expect(getGatewayHost()).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Request guards
// ---------------------------------------------------------------------------

describe('ipfsProxy — request guards', () => {
  const nonGetMethods = ['POST', 'PUT', 'PATCH', 'DELETE']

  nonGetMethods.forEach((method) => {
    it(`returns 405 for ${method}`, async () => {
      const res = mockRes()
      await ipfsProxy(mockReq({ method }), res)

      expect(res.set).toHaveBeenCalledWith('Allow', 'GET')
      expect(res.status).toHaveBeenCalledWith(405)
      expect(axios.get).not.toHaveBeenCalled()
    })
  })

  it('returns 503 when IPFS_GATEWAY_HOST is not set', async () => {
    delete process.env.IPFS_GATEWAY_HOST
    const res = mockRes()
    await ipfsProxy(mockReq(), res)

    expect(res.status).toHaveBeenCalledWith(503)
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('returns 400 for a non-CID path without calling upstream', async () => {
    const res = mockRes()
    await ipfsProxy(mockReq({ url: '/etc/passwd', path: '/etc/passwd' }), res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(axios.get).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Proxying
// ---------------------------------------------------------------------------

describe('ipfsProxy — proxying', () => {
  it('injects the gateway token header and builds the upstream URL', async () => {
    process.env.IPFS_GATEWAY_TOKEN = TOKEN
    const response = streamResponse()
    axios.get.mockResolvedValue(response)
    const res = mockRes()

    await ipfsProxy(mockReq({ url: `/${CID}/bundle.json?x=1` }), res)

    expect(axios.get).toHaveBeenCalledWith(
      `https://${HOST}/ipfs/${CID}/bundle.json?x=1`,
      expect.objectContaining({
        headers: { 'x-pinata-gateway-token': TOKEN },
        responseType: 'stream',
      }),
    )
    expect(res.status).toHaveBeenCalledWith(200)
    expect(response.data.pipe).toHaveBeenCalledWith(res)
  })

  it('omits the token header when none is configured', async () => {
    axios.get.mockResolvedValue(streamResponse())
    await ipfsProxy(mockReq(), mockRes())

    expect(axios.get).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: {} }),
    )
  })

  it('forwards content-type and sets immutable cache headers on 2xx', async () => {
    axios.get.mockResolvedValue(
      streamResponse({ headers: { 'content-type': 'text/html' } }),
    )
    const res = mockRes()
    await ipfsProxy(mockReq(), res)

    expect(res.set).toHaveBeenCalledWith('content-type', 'text/html')
    expect(res.set).toHaveBeenCalledWith(
      'Cache-Control',
      expect.stringContaining('immutable'),
    )
  })

  it('forwards a 4xx upstream status without caching it', async () => {
    axios.get.mockResolvedValue(streamResponse({ status: 404 }))
    const res = mockRes()
    await ipfsProxy(mockReq(), res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.set).not.toHaveBeenCalledWith(
      'Cache-Control',
      expect.stringContaining('immutable'),
    )
  })
})

// ---------------------------------------------------------------------------
// Redirect safety
// ---------------------------------------------------------------------------

describe('ipfsProxy — redirect safety', () => {
  it('caps redirects and blocks cross-host hops so the token cannot leak', async () => {
    process.env.IPFS_GATEWAY_TOKEN = TOKEN
    axios.get.mockResolvedValue(streamResponse())
    await ipfsProxy(mockReq(), mockRes())

    const opts = axios.get.mock.calls[0][1]
    expect(opts.maxRedirects).toBeLessThanOrEqual(2)
    expect(typeof opts.beforeRedirect).toBe('function')
    // a trailing-slash redirect on the same host is allowed
    expect(() => opts.beforeRedirect({ hostname: HOST })).not.toThrow()
    // a redirect to any other host is rejected
    expect(() => opts.beforeRedirect({ hostname: 'evil.example.com' })).toThrow(
      /cross-host/i,
    )
  })
})

// ---------------------------------------------------------------------------
// Upstream failure
// ---------------------------------------------------------------------------

describe('ipfsProxy — upstream failure', () => {
  it('returns 502 on a network error', async () => {
    axios.get.mockRejectedValue(new Error('ECONNREFUSED'))
    const res = mockRes()
    await ipfsProxy(mockReq(), res)

    expect(res.status).toHaveBeenCalledWith(502)
  })

  it('returns 502 on an upstream 5xx', async () => {
    axios.get.mockResolvedValue(streamResponse({ status: 503 }))
    const res = mockRes()
    await ipfsProxy(mockReq(), res)

    expect(res.status).toHaveBeenCalledWith(502)
  })
})
