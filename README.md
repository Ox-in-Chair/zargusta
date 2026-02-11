# 🏌️ ZARgusta

**Augusta 2036 Bitcoin Investment Fund Tracker**

A pooled Bitcoin fund tracker for a group of friends saving for the 2036 Masters Tournament trip. Live BTC/ZAR prices, contribution tracking, purchase history, and progress toward the R1,000,000 goal.

## Features

- **Live Dashboard** — Real-time BTC/ZAR & BTC/USD prices via CoinGecko (30s auto-refresh)
- **Portfolio Tracking** — Total holdings, P&L, per-member share calculations
- **Augusta 2036 Progress** — Visual countdown to the R1M target
- **Member Management** — 9 members tracked (7 active), including transitions (Frank→Mearp, Rich Nischk exit)
- **Contribution History** — 357 contributions from Oct 2021
- **Purchase Log** — 39 BTC purchases with price-at-time tracking
- **API-first** — RESTful JSON API with standardised envelope, Zod validation

## Tech Stack

- **Runtime:** Node.js 20+ / TypeScript (strict, ES modules)
- **Server:** Express 5 + Helmet + CORS + compression
- **Frontend:** Browser-native ES modules (no build tools)
- **Validation:** Zod
- **Data:** JSON file persistence (migrated from Python/Flask)
- **UI:** Kangopak warm neutrals design standard, WCAG 2.1 AA

## Quick Start

```bash
npm install
npm run dev        # Development with hot reload
npm start          # Production
```

Runs on `http://localhost:3002` by default.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | Health check |
| GET | `/api/portfolio` | Live portfolio snapshot with BTC price |
| GET | `/api/btc/price` | Current BTC price (ZAR + USD) |
| GET | `/api/btc/history?days=30` | Historical BTC/ZAR prices |
| GET | `/api/members` | All members |
| GET | `/api/members/active` | Active members only |
| GET | `/api/contributions` | All contributions |
| POST | `/api/contributions` | Add contribution (memberId, memberName, amountZar) |
| GET | `/api/purchases` | All BTC purchases |
| POST | `/api/purchases` | Record purchase (btcBought, priceZar, amountInvested) |
| GET | `/api/fund/info` | Fund metadata |
| GET | `/api/fund/summary` | Computed fund summary |

All responses use standardised envelope: `{ success, data, error, meta: { timestamp, version } }`

## History

Originally `bitties` — a Python/Flask app with JSON persistence (Aug 2025). Rebuilt as TypeScript ES modules app (Feb 2026) with modern security headers, input validation, and Kangopak design standard UI.

## Fund Details

- **Founded:** October 2021
- **Goal:** R1,000,000 by April 2036 (Masters Tournament)
- **Total invested:** R99,600
- **BTC holdings:** ~0.111 BTC
- **BTC purchaser:** Salad
- **Active members:** 7 (Salad, Just, Jan, Ox, Flanners, Jerry, Mearp)
