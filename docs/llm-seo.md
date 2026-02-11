# LLM SEO Optimization

## The Problem

The PFT Explorer was completely invisible to AI systems and largely invisible to search engines.

**Root causes:**

1. **Client-side SPA renders nothing without JavaScript.** AI crawlers (ChatGPT, Perplexity, Claude, Google's AI Overview) fetch raw HTML but don't execute JavaScript. They saw only: "You need to enable JavaScript to run this app." Every page on the explorer was a blank page to every LLM.

2. **robots.txt blocked everything.** The original configuration was `Disallow: /*` — only the homepage and two network pages were allowed. Every ledger, transaction, account, and validator page was explicitly blocked from crawlers.

3. **No structured data.** No JSON-LD, no Open Graph tags, no Twitter Cards, no `llms.txt`. Search engines and AI systems had zero semantic context about what the explorer contains.

4. **No semantic HTML.** The entire app was built with `<div>` elements — no `<main>`, `<footer>`, `<nav>`, `<article>`. Screen readers and crawlers had no understanding of page structure.

5. **Generic meta descriptions.** The same description was used for every page. Individual ledgers, transactions, and accounts had no page-specific metadata.

## What We Did

### Phase 1: Static SEO Files

- **`robots.txt`** — Replaced restrictive rules with `Allow: /` to unblock all pages for all crawlers.
- **`llms.txt`** — Added a Markdown file following the llms.txt proposed standard. Describes the explorer's purpose, available pages, dynamic routes, and API endpoints. Placed at `/llms.txt` for LLMs to consume at inference time.
- **`sitemap.xml`** — Added a server-generated dynamic sitemap with all static routes (homepage, network pages, amendments). Served at `/sitemap.xml` with proper XML formatting, priority values, and change frequencies.
- **`lang` attribute** — Added `lang="en"` to `<html>` with dynamic updates based on the user's selected language via i18next.

### Phase 2: Meta Tags and Structured Data

- **`SEOHelmet` component** — Created a reusable component (`src/containers/shared/components/SEOHelmet.tsx`) that renders Open Graph tags, Twitter Card tags, and optional BreadcrumbList JSON-LD. All page components use this instead of bare `<Helmet>`.
- **JSON-LD structured data** — Added `WebSite` and `Organization` schemas to the app wrapper. Individual pages include `BreadcrumbList` schemas for navigation context.
- **Per-page meta descriptions** — Added 15 new i18n translation keys for page-specific descriptions. Each page now has a unique, content-rich description (e.g., "View ledger #12345 on the PFT blockchain. See transactions, fees, and close time.").
- **`<noscript>` content** — Replaced the useless "enable JavaScript" message with semantic HTML that describes the site, lists key features, and provides navigation links. This gives non-JS crawlers immediate context.
- **Open Graph defaults** — Added `og:site_name`, `og:type`, `og:title`, `og:description`, `twitter:card`, `twitter:title`, `twitter:description` to the app wrapper Helmet.

### Phase 3: Prerender Middleware

This is the highest-impact change. Without it, AI crawlers still see empty HTML.

- **`prerender-node` middleware** — Added to the Express server. Detects bot user-agents and proxies the request to a Prerender server that renders the page with headless Chrome and returns full HTML. Normal users are unaffected — they get the SPA as before.
- **Bot detection** — In addition to the default Googlebot/Bingbot detection, added: ChatGPT-User, OAI-SearchBot, PerplexityBot, ClaudeBot, Claude-Web, Applebot, GPTBot, Google-Extended, CCBot, FacebookBot, Amazonbot, YouBot, Bytespider.
- **Prerender sidecar** — Runs as a separate Docker container (`cereal/prerender`) alongside the explorer. Contains headless Chromium with file-based caching (24h TTL, 1000 page max). Keeps the main Explorer image lean.
- **Conditional activation** — Prerender only activates when `PRERENDER_SERVICE_URL` is set. Empty = disabled. No impact in development.

### Phase 4: Semantic HTML

- `<div className="content">` changed to `<main className="content">`
- `<div className="footer">` changed to `<footer className="footer">`
- Header and `<nav>` were already correct (no changes needed)

## Design Refresh (Planned)

A visual redesign is planned as a follow-up. The explorer will maintain its black-and-white color scheme (consistent with the Post Fiat brand) while differentiating from the XRPL Explorer with a design that appeals to the crypto and AI community.

## Files Changed

| File | Change |
|------|--------|
| `public/robots.txt` | Allow all crawlers |
| `public/llms.txt` | New — LLM-friendly site description |
| `server/routes/v1/sitemap.js` | New — dynamic sitemap generator |
| `server/index.js` | Sitemap route + prerender middleware |
| `src/index.html` | `lang` attr, noscript content, meta description |
| `src/containers/shared/components/SEOHelmet.tsx` | New — reusable SEO component |
| `src/containers/App/index.tsx` | JSON-LD, OG defaults, dynamic lang |
| `src/containers/App/App.tsx` | `<div>` to `<main>` |
| `src/containers/Footer/index.jsx` | `<div>` to `<footer>` |
| `src/containers/Ledgers/index.tsx` | SEOHelmet integration |
| `src/containers/Ledger/index.tsx` | SEOHelmet + breadcrumbs |
| `src/containers/Accounts/index.tsx` | SEOHelmet + breadcrumbs |
| `src/containers/Accounts/AMM/AMMAccounts/index.tsx` | SEOHelmet |
| `src/containers/Transactions/index.tsx` | SEOHelmet + breadcrumbs |
| `src/containers/Validators/index.tsx` | SEOHelmet + breadcrumbs |
| `src/containers/Network/Validators.tsx` | SEOHelmet |
| `src/containers/Network/Exclusions.tsx` | SEOHelmet |
| `src/containers/Token/index.tsx` | SEOHelmet |
| `src/containers/NFT/NFT.tsx` | SEOHelmet |
| `src/containers/MPT/MPT.tsx` | SEOHelmet |
| `public/locales/en-US/translations.json` | Meta descriptions, fixed author |
| `.env.example`, `.env.devnet`, `.env.testnet` | PRERENDER_SERVICE_URL |
| `scripts/docker-compose.devnet.yml` | Prerender sidecar service |
| `scripts/docker-compose.testnet.yml` | Prerender sidecar service |
| `package.json` | prerender-node dependency |
