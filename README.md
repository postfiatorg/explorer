[![Build](https://github.com/postfiatorg/explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/postfiatorg/explorer/actions)
[![License](https://img.shields.io/github/license/postfiatorg/explorer)](https://github.com/postfiatorg/explorer/blob/main/LICENSE)

# Post Fiat Explorer

Block explorer for the Post Fiat network, forked from the [XRPL Explorer](https://github.com/ripple/explorer).

## Getting Started

### Prerequisites

- Node.js 22+ ([nodejs.org](https://nodejs.org) or [nvm](https://github.com/nvm-sh/nvm))
- npm 8+

### Setup

```bash
cp .env.example .env
npm install
npm start
```

For production: `npm run build` then `npm run prod-server`

### Apple Silicon

`canvas` requires manual compilation on Apple chips. Install dependencies per [node-canvas instructions](https://github.com/Automattic/node-canvas#compiling).

## Testing

- `npm test` — run tests in watch mode
- `npm run test:coverage` — generate coverage report
- `npm run lint` — check code style

## Responsive Breakpoints

| Name                 | Range          |
|----------------------|----------------|
| phone-only           | 0 – 375px     |
| tablet-portrait-up   | 375 – 600px   |
| tablet-landscape-up  | 600 – 900px   |
| desktop-up           | 900 – 1200px  |
| big-desktop-up       | 1200px+        |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions and guidelines.

## Documentation

- [Routing](./docs/routing.md)
- [Translations](./docs/translating.md)
- [Defining transactions](./src/containers/shared/components/Transaction/README.md)

## License

[ISC](LICENSE)
