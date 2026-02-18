# PFT Explorer — Codebase Analysis

A blockchain explorer for the Post Fiat (PFT) network, forked from the XRPL Explorer. Connects to `rippled` nodes via WebSocket to display real-time ledger data, transactions, accounts, validators, tokens, NFTs, and network status.

## Tech Stack

| Category           | Technology                                        |
| ------------------ | ------------------------------------------------- |
| Language           | TypeScript / JavaScript (mixed, migrating to TS)  |
| Framework          | React 17 (class + functional components)          |
| Build              | Vite 6                                            |
| Routing            | React Router v6 (typed route definitions)         |
| State              | React Query (server state), React Context (socket/network), local useState |
| Styling            | SCSS with responsive breakpoint mixins            |
| Data Fetching      | WebSocket (`xrpl-client`) for real-time, Axios for REST (VHS API) |
| Charts             | Recharts, D3 (geo/hexbin for network map)         |
| i18n               | i18next (EN, ES, FR, JA, KO)                     |
| SEO                | react-helmet-async, prerender-node for bot SSR    |
| Server             | Express.js (static serving + API proxy)           |
| Deployment         | Docker (multi-stage build), Node 22               |

---

## Pages

### `/` — Homepage (Ledgers)

**Files:** `src/containers/Ledgers/`

Live dashboard showing the ledger stream in real time. Displays rolling metrics (transactions/sec, ledger close interval, fees, quorum) via the `Streams` WebSocket subscriber. Lists recent ledgers with transaction counts and close times. Shows validator count fetched from the VHS API.

| Subcomponent       | Purpose                                                    |
| ------------------ | ---------------------------------------------------------- |
| `LedgerMetrics`    | Dashboard cards: txn/sec, ledger interval, fees, quorum    |
| `LedgerListEntry`  | Single ledger row (index, hash, txn count, close time)     |
| `Ledgers`          | Renders the scrolling list of recent ledgers               |

---

### `/ledgers/:identifier` — Ledger Detail

**Files:** `src/containers/Ledger/`

Displays a single ledger's metadata (index, hash, close time, parent hash, state hash) and its full transaction list.

| Subcomponent              | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `LedgerTransactionTable`  | Paginated transaction table within this ledger |
| `LedgerTransactionTableRow` | Individual transaction row                  |

---

### `/accounts/:id/:tab?/:assetType?` — Account Detail

**Files:** `src/containers/Accounts/`

Account page with two variants: regular accounts and AMM (Automated Market Maker) accounts. The `AccountsRouter` detects the account type via `getAccountInfo` and renders the appropriate view. Regular accounts show balance, transaction history, and issued assets. Defaults the currency selector to "PFT".

| Subcomponent              | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `AccountsRouter`          | Detects account type, routes to correct view         |
| `AccountHeader`           | Balance display with `BalanceSelector` dropdown      |
| `AccountTransactionTable` | Paginated transaction history for the account        |
| `AccountAssetTab`         | Asset tab: issued tokens, NFTs, MPTs                 |
| `AccountIssuedTokenTable` | Table of tokens issued by this account               |
| `AccountNFTTable`         | Table of NFTs owned by this account                  |
| `AccountMPTTable`         | Table of Multi-Purpose Tokens for this account       |
| `AMM/AMMAccounts`         | Specialized view for AMM pool accounts               |
| `AMM/AMMAccountHeader`    | Header for AMM accounts showing pool details         |
| `Errors`                  | Error message definitions for account pages          |

---

### `/transactions/:identifier/:tab?` — Transaction Detail

**Files:** `src/containers/Transactions/`

Displays a single transaction identified by hash or CTID. Validates the format, fetches via WebSocket, and renders three tabs: human-readable summary, detailed metadata, and raw JSON.

| Subcomponent   | Purpose                                            |
| -------------- | -------------------------------------------------- |
| `SimpleTab`    | Human-readable transaction summary                 |
| `DetailTab`    | Detailed metadata view with all fields             |
| Raw JSON tab   | Full raw transaction JSON (uses shared `JsonView`) |

---

### `/token/:token` — Token Detail

**Files:** `src/containers/Token/`

Token page showing metadata (issuer, currency code, supply info) and a filtered transaction history for that specific token.

| Subcomponent            | Purpose                                    |
| ----------------------- | ------------------------------------------ |
| `TokenHeader`           | Token metadata display (issuer, code, etc) |
| `TokenTransactionTable` | Transactions involving this token          |

---

### `/nft/:id/:tab?` — NFT Detail

**Files:** `src/containers/NFT/`

NFT detail page with tabbed views for transaction history, active buy offers, and active sell offers.

| Subcomponent | Purpose                                    |
| ------------ | ------------------------------------------ |
| `NFTHeader`  | NFT metadata (ID, issuer, taxon, flags)    |
| `NFTTabs`    | Tabs: transactions, buy offers, sell offers |

---

### `/mpt/:id` — Multi-Purpose Token Detail

**Files:** `src/containers/MPT/`

Detail page for Multi-Purpose Tokens showing metadata and related information.

| Subcomponent | Purpose              |
| ------------ | -------------------- |
| `MPTHeader`  | MPT metadata display |

---

### `/network/nodes` — Network Nodes

**Files:** `src/containers/Network/Nodes.tsx`, `NodesTable.tsx`, `Map.tsx`, `Hexagons.jsx`

Geographic map visualization (D3 hexbin projection) of all network nodes plus a tabular listing. Shows node locations, versions, and uptime.

| Subcomponent      | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `NodesTable`      | Tabular list of all network nodes              |
| `Map` / `Hexagons`| D3-based geographic hexbin map of node locations |

---

### `/network/validators/:tab?` — Network Validators

**Files:** `src/containers/Network/Validators.tsx`, `ValidatorsTable.tsx`, `ValidatorsTabs.tsx`

List of all validators on the network with tabs for uptime and voting views. Includes a bar chart of `rippled` version distribution.

| Subcomponent      | Purpose                                     |
| ----------------- | ------------------------------------------- |
| `ValidatorsTable` | Table listing all validators                |
| `ValidatorsTabs`  | Tab navigation (uptime / voting)            |
| `BarChartVersion` | Bar chart of rippled version distribution   |

---

### `/network/upgrade-status` — Upgrade Status

**Files:** `src/containers/Network/UpgradeStatus.tsx`

Shows the current upgrade status of the network — how many validators have upgraded to the latest version vs. older versions.

---

### `/network/exclusions` — Network Exclusions

**Files:** `src/containers/Network/Exclusions.tsx`

Displays validators currently on the negative UNL (excluded from consensus).

---

### `/validators/:identifier/:tab?` — Individual Validator Detail

**Files:** `src/containers/Validators/`

Detail page for a single validator with tabs for basic info, history, amendment voting, and exclusion status.

| Subcomponent    | Purpose                                  |
| --------------- | ---------------------------------------- |
| `SimpleTab`     | Basic validator info (domain, key, UNL)  |
| `HistoryTab`    | Validator agreement/performance history  |
| `VotingTab`     | Amendment votes cast by this validator   |
| `ExclusionsTab` | Exclusion/negative UNL history           |

---

### `/amendments` — Amendments List

**Files:** `src/containers/Amendments/`

Lists all protocol amendments with their status (enabled, in voting, vetoed, not yet voted on).

| Subcomponent      | Purpose                        |
| ----------------- | ------------------------------ |
| `AmendmentsTable` | Table of all amendments        |

---

### `/amendment/:identifier` — Amendment Detail

**Files:** `src/containers/Amendment/`

Detail page for a single amendment showing its description, voting progress, and individual validator votes.

| Subcomponent      | Purpose                                   |
| ----------------- | ----------------------------------------- |
| `BarChartVoting`  | Visual voting progress bar chart          |
| `Votes`           | List of individual validator votes        |
| `Simple`          | Amendment summary (name, status, threshold) |

---

### `*` — 404 Page

**Files:** `src/containers/NoMatch/`

Catch-all error page with configurable title and helpful hints.

---

### Custom Network Home

**Files:** `src/containers/CustomNetworkHome/`

Landing page for custom network mode where users can enter a `rippled` WebSocket URL to connect to any network.

---

## Layout Components

### Header

**Files:** `src/containers/Header/`

Site header containing the logo, universal search bar, navigation menu, language picker, and network environment picker.

| Subcomponent      | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `Search`          | Universal search (accounts, transactions, ledgers, tokens) |
| `NavigationMenu`  | Main nav with submenu support (Explorer, Network)    |
| `LanguagePicker`  | i18n language selector                               |
| `NetworkPicker`   | Network environment selector (mainnet/testnet/devnet)|

### Footer

**Files:** `src/containers/Footer/`

Site footer with links and branding.

---

## Shared Components

**Location:** `src/containers/shared/components/`

### Core Infrastructure

| Component              | Purpose                                                              |
| ---------------------- | -------------------------------------------------------------------- |
| `Streams`              | Headless class component that subscribes to WebSocket `ledger` and `validations` streams. Manages real-time ledger/validator state, computes rolling metrics, fetches load fees. The heart of live data. |
| `SEOHelmet`            | Per-page SEO meta tags (title, description, OpenGraph, Twitter, JSON-LD breadcrumbs) |
| `TransactionTable`     | Reusable paginated transaction table used across multiple pages      |
| `TransactionActionIcon`| Icon representing a transaction type                                 |
| `JsonView`             | JSON viewer (wraps `react18-json-view`)                              |

### Display Components

| Component              | Purpose                                                   |
| ---------------------- | --------------------------------------------------------- |
| `Account`              | Account address display with link                         |
| `Amount`               | Currency amount formatting                                |
| `Currency`             | Currency code display                                     |
| `TxStatus`             | Transaction status badge (success/failure)                |
| `TxLabel`              | Transaction type label                                    |
| `TxToken`              | Token reference within transactions                       |
| `TxDetails`            | Transaction detail rendering                              |
| `DomainLink`           | External domain link                                      |
| `TokenTableRow`        | Token row in tables                                       |
| `TokenSearchResults`   | Token search result display (used by Search)              |
| `NFTokenLink`          | NFT reference link                                        |
| `MPTokenLink`          | MPT reference link                                        |
| `Sequence`             | Sequence number display                                   |

### UI Primitives

| Component        | Purpose                                       |
| ---------------- | --------------------------------------------- |
| `Tabs`           | Reusable tab navigation                       |
| `Loader`         | Loading spinner                               |
| `Dropdown`       | Dropdown menu with `DropdownItem`             |
| `Tooltip`        | Tooltip with `useTooltip` hook                |
| `Notification`   | Toast notification component                  |
| `LoadMoreButton` | Pagination load-more button                   |
| `EmptyMessageTableRow` | Empty state for tables                  |

### Transaction Type Components

**Location:** `src/containers/shared/components/Transaction/`

Plugin architecture: each XRPL transaction type exports a `TransactionMapping` with `Simple`, `Description`, `TableDetail`, `parser`, `action`, and `category`. All types are registered in a central `transactionTypes` map.

**44 supported transaction types:**

| Category         | Types                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| Payments         | Payment, Clawback                                                                       |
| Account          | AccountDelete, AccountSet, SetRegularKey, SignerListSet, TicketCreate, DelegateSet       |
| DEX              | OfferCreate, OfferCancel                                                                |
| AMM              | AMMBid, AMMClawback, AMMCreate, AMMDelete, AMMDeposit, AMMVote, AMMWithdraw             |
| Escrow           | EscrowCreate, EscrowCancel, EscrowFinish                                                |
| Payment Channels | PaymentChannelCreate, PaymentChannelClaim, PaymentChannelFund                           |
| Trust            | TrustSet, DepositPreauth                                                                |
| NFT              | NFTokenMint, NFTokenBurn, NFTokenCreateOffer, NFTokenAcceptOffer, NFTokenCancelOffer    |
| MPT              | MPTokenIssuanceCreate, MPTokenIssuanceDestroy, MPTokenIssuanceSet, MPTokenAuthorize     |
| Hooks            | SetHook                                                                                 |
| Oracle           | OracleSet, OracleDelete                                                                 |
| DID              | DIDSet, DIDDelete                                                                       |
| Credentials      | CredentialCreate, CredentialAccept, CredentialDelete                                    |
| Permissioned     | PermissionedDomainSet, PermissionedDomainDelete                                         |
| Network/Admin    | EnableAmendment, SetFee, UNLModify                                                      |
| Cross-Chain      | XChainBridge (8 subtypes)                                                               |
| Batch            | Batch                                                                                   |

---

## Context Providers

| Provider          | Purpose                                                                          |
| ----------------- | -------------------------------------------------------------------------------- |
| `SocketContext`   | Creates/manages `XrplClient` WebSocket connections (main, P2P, archive sockets). Provides `useIsOnline` hook. |
| `NetworkContext`  | Provides current network name (main/test/dev/xahau-main/xahau-test) resolved from env vars or VHS API. |
| `QueryClient`     | React Query client instance for server state caching.                            |

---

## Data Layer

**Location:** `src/rippled/`

WebSocket API layer that communicates with `rippled` nodes.

| Module                 | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `accountState`         | Fetches account info, balances, settings         |
| `accountTransactions`  | Paginated transaction history for accounts       |
| `ledgers`              | Fetch ledger data                                |
| `transactions`         | Fetch single transaction by hash/CTID            |
| `token`                | Token metadata                                   |
| `offers`               | Order book offers                                |
| `quorum`               | UNL quorum info                                  |
| `nUNL`                 | Negative UNL data                                |
| `NFTTransactions`      | NFT-specific transaction queries                 |
| `lib/rippled`          | Low-level WebSocket command wrappers             |
| `lib/summarizeLedger`  | Summarizes ledger data for display               |
| `lib/convertRippleDate`| Ripple epoch to JS Date conversion               |

---

## Server

**Location:** `server/`

Express.js production server: serves the Vite build as static files, proxies API routes, and handles prerender middleware for SEO bots (Google, ChatGPT, Perplexity, Claude, etc.).

| Endpoint             | Purpose                               |
| -------------------- | ------------------------------------- |
| `/api/v1/metrics`    | Network metrics                       |
| `/api/v1/health`     | Health check                          |
| `/api/v1/tokens`     | Token search                          |
| `/sitemap.xml`       | Dynamic sitemap generation            |
| `/robots.txt`        | Dynamic robots.txt with sitemap URL   |

---

## Post Fiat Customizations (vs upstream XRPL Explorer)

- Native currency label: "XRP" → "PFT" (in `utils.js` `renderXRP` and account defaults)
- WebSocket host: `ws.devnet.postfiat.org`
- VHS API: `vhs.devnet.postfiat.org`
- Navigation links: `postfiat.org`, `github.com/postfiatorg/explorer`
- SEO: "PFT Explorer", "Post Fiat (PFT) Ledger"
- Base URLs: `explorer.postfiat.org` / `explorer.testnet.postfiat.org` / `explorer.devnet.postfiat.org`
- Env configs: `.env.devnet`, `.env.testnet`
- Prerender middleware for LLM crawlers
- New `HUD` component (in progress, untracked)
