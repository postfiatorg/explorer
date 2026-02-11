const { getBaseUrl } = require('../../lib/baseUrl')

module.exports = (_req, res) => {
  const baseUrl = getBaseUrl()

  const text = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`

  res.set('Content-Type', 'text/plain')
  res.send(text)
}
