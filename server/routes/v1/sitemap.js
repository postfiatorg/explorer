const { getBaseUrl } = require('../../lib/baseUrl')

const STATIC_ROUTES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/network/nodes', priority: '0.8', changefreq: 'hourly' },
  { path: '/network/validators', priority: '0.8', changefreq: 'hourly' },
  { path: '/network/upgrade-status', priority: '0.6', changefreq: 'daily' },
  { path: '/network/exclusions', priority: '0.6', changefreq: 'daily' },
  { path: '/amendments', priority: '0.7', changefreq: 'daily' },
]

module.exports = (_req, res) => {
  const baseUrl = getBaseUrl()
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
