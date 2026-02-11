# Security Policy

## Reporting Vulnerabilities

Report security issues to the repository owner directly. Do not open public issues.

## Measures

- **Helmet.js** — HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- **CORS** — configurable via `CORS_ORIGIN` env var
- **Input validation** — Zod schemas on all mutation endpoints
- **No secrets in code** — all sensitive config via environment variables
- **JSON payload limit** — 1MB max to prevent abuse
- **Rate limiting** — recommended via reverse proxy (nginx/Cloudflare) in production
