const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/network/nodes', priority: '0.8', changefreq: 'hourly' },
  { path: '/network/validators', priority: '0.8', changefreq: 'hourly' },
  { path: '/network/upgrade-status', priority: '0.6', changefreq: 'daily' },
  { path: '/network/exclusions', priority: '0.6', changefreq: 'daily' },
  { path: '/amendments', priority: '0.7', changefreq: 'daily' },
]

const BASE_URL_BY_ENV = {
  mainnet: 'https://explorer.postfiat.org',
  testnet: 'https://explorer.testnet.postfiat.org',
  devnet: 'https://explorer.devnet.postfiat.org',
}
const ENV_BASE_URL_BY_ENV = {
  mainnet: process.env.VITE_MAINNET_LINK,
  testnet: process.env.VITE_TESTNET_LINK,
  devnet: process.env.VITE_DEVNET_LINK,
  xahau_mainnet: process.env.VITE_XAHAU_MAINNET_LINK,
  xahau_testnet: process.env.VITE_XAHAU_TESTNET_LINK,
  custom: process.env.VITE_CUSTOMNETWORK_LINK,
}
const normalizeBaseUrl = (url) => (url ? url.replace(/\/$/, '') : url)

module.exports = (_req, res) => {
  const env = process.env.VITE_ENVIRONMENT || 'mainnet'
  const baseUrl = normalizeBaseUrl(
    ENV_BASE_URL_BY_ENV[env] || BASE_URL_BY_ENV[env] || BASE_URL_BY_ENV.mainnet,
  )
  const now = new Date().toISOString().split('T')[0]

  const urls = STATIC_ROUTES.map(
    (route) => `
  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  ).join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`

  res.set('Content-Type', 'application/xml')
  res.send(xml)
}
