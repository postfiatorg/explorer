import { FC, useEffect } from 'react'
import { ExternalLink, Terminal, Globe, Github } from 'lucide-react'
import { SEOHelmet } from '../shared/components/SEOHelmet'
import { useAnalytics } from '../shared/analytics'
import './developers.scss'

const API_ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/metrics',
    description: 'Returns current network metrics snapshot',
    response: '{ base_fee, txn_sec, txn_ledger, ledger_interval, avg_fee }',
  },
  {
    method: 'GET',
    path: '/api/v1/health',
    description: 'Health check endpoint',
    response: '{ status: "OK" }',
  },
  {
    method: 'GET',
    path: '/api/v1/tokens/search/:query',
    description: 'Search for tokens by currency code',
    response: '{ tokens: [{ currency, issuer, ... }] }',
  },
]

export const Developers: FC = () => {
  const { trackScreenLoaded } = useAnalytics()

  useEffect(() => {
    trackScreenLoaded()
  }, [trackScreenLoaded])

  const rippledHost = process.env.VITE_RIPPLED_HOST || 'wss://pft.postfiat.org'

  return (
    <div className="developers-page">
      <SEOHelmet
        title="Developers"
        description="API documentation and developer resources for the PFT Explorer"
        path="/developers"
      />
      <h1 className="developers-title">Developers</h1>
      <p className="developers-intro">
        Resources for integrating with the PFT Ledger and Explorer API.
      </p>

      <section className="developers-section">
        <h2 className="developers-section-title">
          <Terminal size={20} /> API Endpoints
        </h2>
        <div className="developers-endpoints">
          {API_ENDPOINTS.map((endpoint) => (
            <div key={endpoint.path} className="endpoint-card">
              <div className="endpoint-header">
                <span className="endpoint-method">{endpoint.method}</span>
                <code className="endpoint-path">{endpoint.path}</code>
              </div>
              <p className="endpoint-description">{endpoint.description}</p>
              <div className="endpoint-response">
                <span className="endpoint-response-label">Response:</span>
                <code>{endpoint.response}</code>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="developers-section">
        <h2 className="developers-section-title">
          <Globe size={20} /> WebSocket
        </h2>
        <div className="developers-card">
          <div className="developers-row">
            <span className="developers-label">Connection URL</span>
            <code className="developers-value">{rippledHost}</code>
          </div>
          <div className="developers-row">
            <span className="developers-label">Available Streams</span>
            <div className="developers-tags">
              <code className="developers-tag">ledger</code>
              <code className="developers-tag">validations</code>
            </div>
          </div>
          <div className="developers-row">
            <span className="developers-label">Subscribe Command</span>
            <code className="developers-code-block">
              {`{ "command": "subscribe", "streams": ["ledger", "validations"] }`}
            </code>
          </div>
        </div>
      </section>

      <section className="developers-section">
        <h2 className="developers-section-title">
          <ExternalLink size={20} /> Links
        </h2>
        <div className="developers-links">
          <a
            href="https://github.com/postfiatorg/explorer"
            target="_blank"
            rel="noopener noreferrer"
            className="developers-link-card"
          >
            <Github size={20} />
            <div>
              <span className="developers-link-title">PFT Explorer on GitHub</span>
              <span className="developers-link-desc">Source code and contributions</span>
            </div>
          </a>
          <a
            href="https://postfiat.org"
            target="_blank"
            rel="noopener noreferrer"
            className="developers-link-card"
          >
            <Globe size={20} />
            <div>
              <span className="developers-link-title">PostFiat.org</span>
              <span className="developers-link-desc">Official project website</span>
            </div>
          </a>
        </div>
      </section>
    </div>
  )
}
