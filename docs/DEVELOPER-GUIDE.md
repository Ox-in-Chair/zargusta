# Developer Guide

## Architecture

```
zargusta/
├── public/              # Browser-native ES modules (no build tools)
│   ├── index.html       # SPA shell, 2-column layout
│   ├── css/style.css    # Kangopak warm neutrals design system
│   └── js/app.js        # Client-side app (ES module)
├── src/
│   ├── server/          # Express 5 backend
│   │   ├── index.ts     # Entry point, middleware, static serving
│   │   ├── routes.ts    # API routes with Zod validation
│   │   ├── data-manager.ts  # JSON file persistence layer
│   │   ├── btc-price.ts     # CoinGecko price fetching + caching
│   │   └── portfolio.ts     # Portfolio calculations
│   ├── shared/          # Shared types (server + documentation)
│   │   └── types.ts
│   └── data/            # JSON data files (fund history)
│       ├── historical_data.json
│       └── fund_summary.json
├── docs/
│   └── DEVELOPER-GUIDE.md
├── SECURITY.md
└── README.md
```

## Configuration

All config via environment variables (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Server port |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |

## Data Model

Data is persisted in JSON files in `src/data/`. The `DataManager` class handles read/write with snake_case→camelCase conversion from the legacy Python format.

### Key entities:
- **Members** — fund participants with join/leave dates
- **Contributions** — ZAR payments by members (monthly)
- **BTC Purchases** — actual Bitcoin buys with price-at-time
- **Fund Info** — metadata (target, purchaser, transitions)
- **Fund Summary** — computed aggregates (rebuilt on every mutation)

## API Envelope

All endpoints return:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-02-11T14:00:00Z",
    "version": "2.0.0"
  }
}
```

Errors:
```json
{
  "success": false,
  "error": "Validation message",
  "meta": { "timestamp": "...", "version": "2.0.0" }
}
```

## Frontend

Browser-native ES modules — no bundler, no build step. The frontend fetches from `/api/*` and renders with vanilla DOM manipulation. Views: Dashboard, Members, Purchases, Contributions.

## Testing

```bash
npm test          # Run Vitest
npm run build     # TypeScript type-check (no emit)
```

## Deployment

1. `npm install --production`
2. Set `PORT` and `CORS_ORIGIN` env vars
3. `npm start`
4. Reverse proxy (nginx/Cloudflare) recommended for rate limiting + TLS

## Migration from bitties

The Python/Flask `bitties` app's data was migrated directly:
- `data/historical_data.json` — preserved as-is (snake_case)
- `data/fund_summary.json` — regenerated from historical data
- DataManager handles the legacy format internally
