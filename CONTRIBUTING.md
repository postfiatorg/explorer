# Contributing

Thanks for contributing to the Post Fiat Explorer!

We welcome contributions from the community. Whether it's a bug fix, new feature, or documentation improvement, your help is greatly appreciated.

## Getting Started

### Prerequisites

- Node.js 22+ ([nodejs.org](https://nodejs.org) or [nvm](https://github.com/nvm-sh/nvm))
- npm 8+

### Setup

1. Fork the repository at [github.com/postfiatorg/explorer](https://github.com/postfiatorg/explorer)
2. Clone your fork:

```bash
git clone git@github.com:YOUR_USERNAME/explorer.git
cd explorer
git remote add upstream git@github.com:postfiatorg/explorer.git
```

3. Install dependencies and configure environment:

```bash
npm install
cp .env.example .env
```

4. Start the development server:

```bash
npm start
```

### Working on a Feature or Fix

```bash
git fetch upstream main
git checkout -b your-branch-name upstream/main
```

When ready to submit, push your branch and open a pull request against `main`.

## Pull Request Requirements

Before submitting a PR:

- Run `npm run lint` and fix any errors
- Run `npm run build` to confirm the build succeeds
- Mark your PR as a [draft](https://github.blog/2019-02-14-introducing-draft-pull-requests/) until it's ready for review
- Fill in the PR template with a clear description of your changes
- Keep PRs focused — one feature or fix per PR

All React components must be [function components](https://react.dev/learn) using hooks.

## Repository Layout

- `src/` — Frontend source code (React + TypeScript)
- `src/containers/` — Page components and feature modules
- `src/containers/shared/` — Shared components, hooks, and utilities
- `public/` — Static assets, translations, and fonts
- `.env.example` — Environment variable template

## Code Style

- TypeScript for all new code
- SCSS for styling (follows [stylelint-config-standard](https://github.com/stylelint/stylelint-config-standard) and [stylelint-config-recommended-scss](https://github.com/kristerkari/stylelint-config-recommended-scss))
- ESLint and Prettier are configured — run `npm run lint` to check
- Follow existing patterns in the codebase

## Code of Conduct

Please be respectful and constructive in all interactions. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for details.
