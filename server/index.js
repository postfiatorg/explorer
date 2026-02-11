require('dotenv').config()

const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const compression = require('compression')
const prerender = require('prerender-node')
const routes = require('./routes/v1')

const log = require('./lib/logger')({ name: 'server' })

const PORT = process.env.PORT || 5001
const ADDR = process.env.ADDR || 'localhost'
const app = express()
const cacheBustRegExp = /\.[0-9a-f]{20}\./
const files = express.static(path.join(__dirname, '/../build'), {
  etag: true, // Just being explicit about the default.
  lastModified: true, // Just being explicit about the default.
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      // All the project's HTML files end in .html
      res.setHeader('Cache-Control', 'no-cache')
    } else if (cacheBustRegExp.test(filePath)) {
      // If the RegExp matched, then we have a versioned URL.
      res.setHeader('Cache-Control', 'max-age=31536000')
    }
  },
})
const STATIC_FILE_EXTENSIONS = new Set([
  '.js',
  '.css',
  '.map',
  '.json',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico',
  '.webp',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.otf',
  '.txt',
  '.xml',
  '.webmanifest',
])

app.use(compression())
app.use(bodyParser.json())
app.use('/api/v1', routes)
app.get('/sitemap.xml', require('./routes/v1/sitemap'))
app.get('/robots.txt', require('./routes/v1/robots'))

if (process.env.NODE_ENV === 'production') {
  if (process.env.PRERENDER_SERVICE_URL) {
    prerender.set('prerenderServiceUrl', process.env.PRERENDER_SERVICE_URL)
    prerender.set('protocol', 'https')
    prerender.crawlerUserAgents.push(
      'ChatGPT-User',
      'OAI-SearchBot',
      'PerplexityBot',
      'ClaudeBot',
      'Claude-Web',
      'Applebot',
      'anthropic-ai',
      'GPTBot',
      'Google-Extended',
      'CCBot',
      'FacebookBot',
      'Amazonbot',
      'YouBot',
      'Bytespider',
    )
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next()
      if (req.path.startsWith('/api/')) return next()

      const ext = path.extname(req.path).toLowerCase()
      if (ext && STATIC_FILE_EXTENSIONS.has(ext)) return next()

      return prerender(req, res, next)
    })
    log.info(
      `prerender middleware enabled, service: ${process.env.PRERENDER_SERVICE_URL}`,
    )
  }
}

app.use(files)

if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '/../build/index.html'))
  })
}

app.use('*', (req, res) => {
  log.error('not found:', req.originalUrl)
  res.status(404).send({ error: 'route not found' })
})

app.listen(PORT, ADDR)
log.info(`server listening on ${ADDR}:${PORT}`)
