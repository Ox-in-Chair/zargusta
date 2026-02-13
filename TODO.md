# ZARyder Cup — Gap Analysis & TODO

*Generated: 2026-02-12*
*Status: 81 tests passing, live on port 3030*

## Current State

### ✅ Built & Wired
| View | API Endpoints | Status |
|------|--------------|--------|
| Dashboard | portfolio, fund/summary, btc/history, purchases, altcoins, forex, fear-greed, dominance, flights, accommodation, budget | ✅ Full |
| Members | members, portfolio, fund/summary | ✅ Full |
| Purchases | purchases | ✅ Basic — no chart |
| Contributions | contributions, members | ✅ Basic — table only |
| Alt Coins | market/altcoins | ✅ Live CoinGecko |
| Forex | market/forex | ✅ Live rates |
| Crypto News | news/crypto (RSS) | ✅ Live |
| Rugby News | news/rugby (RSS) | ✅ Live |
| Cricket News | news/cricket (RSS) | ✅ Live |
| Golf News | news/golf (RSS) | ✅ Live |
| Trip Planner | trip/plan | ✅ Real Ryder Cup data |
| Flights | trip/flights | ✅ CRUD |
| Accommodation | trip/accommodation | ✅ CRUD |
| Budget | trip/budget, portfolio | ✅ Basic |
| Treasurer | members, contributions, purchases, fund/info, admin/* | ✅ Password-gated |

### Backend
- 34 API endpoints (GET/POST/PUT/PATCH)
- Admin auth middleware (X-Admin-Key)
- Zod validation on all mutations
- Audit trail (audit-log.jsonl)
- Caching layer (altcoins 60s, forex 5m, fear-greed 1h)
- Rate limiting (100 req/min)
- Helmet CSP, CORS, compression

---

## 🔴 Critical Gaps

### 1. Google Sheet Sync (Source of Truth)
The Google Sheet is the single source of truth but there's **no automated sync**.
- Currently: data was manually reconciled into `historical_data.json`
- Need: Periodic sync from Sheet → local data (or at minimum, import endpoint)
- Sheet: `https://docs.google.com/spreadsheets/d/1Q5mqzXGLjaW-hpPDDzKd6kiMdkKPLJMgXUQvAEsVM94`
- Risk: Data drift between Sheet and app

### 2. Duplicate Route Definitions
`routes.ts` and `routes-admin.ts` both define some overlapping endpoints (POST contributions, POST purchases, POST members, PATCH members, admin/adjust-holdings, admin/audit-log). The admin versions add `requireAdmin` middleware. This is fragile — could serve unauthenticated endpoints.
- Fix: Remove unprotected duplicates from `routes.ts` or consolidate into one file

### 3. No Data Backup
File-based JSON storage with no backup strategy. A bad write or disk issue loses everything.
- Need: Periodic backup of `src/data/` to git or external storage

---

## 🟡 Functional Gaps

### 4. Members View — No Share Breakdown
API exists (`/members/:id/share`) but the members view doesn't show:
- Individual BTC holdings (proportional share)
- Current ZAR value per member
- Contribution history per member

### 5. Purchases View — No Visualisation
Just a table. Missing:
- Cost-average chart (avg price paid vs current BTC price)
- DCA performance over time

### 6. Contributions View — No Trends
Just a table. Missing:
- Monthly totals chart
- Per-member contribution timeline
- Outstanding/late payment detection

### 7. Budget View — No Scenario Modeling
Structure exists but no BTC scenario models:
- "What if BTC hits R2M/R3M/R5M — how much of the trip does the fund cover?"
- Per-member cost breakdown
- Fund vs out-of-pocket split visualisation

### 8. Trip Planner — Static Display
Shows data but missing:
- Countdown timer to tournament (2031-09-26)
- Checklist progress bars (passport/visa/insurance/tickets per member)
- Editable from UI (currently API-only for updates)

### 9. Accommodation — No Real Options
Empty bookings. Need:
- Research actual Caldes de Malavella / Girona accommodation options
- Pricing estimates
- Group booking tracking

### 10. Flights — No Research Data
Empty bookings. Need:
- CPT → BCN route research (airlines, typical pricing)
- Group booking coordination

---

## 🟢 Enhancements (Nice to Have)

### 11. Dashboard — Fear & Greed Gauge
API wired (`/market/fear-greed`) but no visual gauge component

### 12. Dashboard — BTC Dominance
API wired (`/market/dominance`) but no visual indicator

### 13. Forex — ZAR Trend
No historical forex data — just current rates. Add 7d/30d sparkline.

### 14. News — Article Images
RSS items have no thumbnails. Parse `<media:content>` or `<enclosure>` tags.

### 15. Mobile — Bottom Nav
Sidebar works on mobile but a bottom nav would be more thumb-friendly.

### 16. Treasurer — Transaction History
Record payment/purchase works but no filterable history view of past transactions.

### 17. Export / Reports
No PDF or CSV export of fund status, member shares, or contribution history.

### 18. Notifications
No reminder system for:
- Late contributions
- Upcoming booking deadlines
- BTC price milestones (fund hits R150K, R200K, etc.)

---

## 🔧 Technical Debt & Compliance

- [ ] **Style guide compliance** — ensure all new code follows `docs/STYLE-GUIDE.md`
- [ ] **Data backup strategy** — file-based JSON with no backup; add periodic git commit or external sync

- [ ] Duplicate import crash fixed (main.js line 19) — verify no other duplicates
- [ ] `routes-admin.ts` duplicates endpoints from `routes.ts` — consolidate
- [ ] `fund_summary.json` appears stale/unused (data-manager calculates live)
- [ ] SPA fallback `sendFile` error handling improved but still logs NotFoundError for favicon/manifest requests
- [ ] No CI/CD — tests run manually or via cron only
- [ ] No TypeScript on frontend (browser-native ES modules by design, but no type checking)

---

## Priority Order

1. **Fix duplicate routes** (security risk — unauthenticated mutations)
2. **Google Sheet sync** (data integrity)
3. **Member share breakdown** in UI
4. **Budget scenario modeling** (core value prop for trip planning)
5. **Contribution trends** (accountability)
6. **Dashboard gauges** (Fear & Greed, dominance)
7. **Trip countdown + checklists**
8. **Real accommodation/flight research**
9. Everything else
