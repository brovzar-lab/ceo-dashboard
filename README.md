# CEO Dashboard

Billy Rovzar's command center for Lemon Studios. Gmail + Calendar + Notion + Anthropic AI in one warm-dark dashboard.

## Setup

1. Clone repo
2. Copy `.env.example` to `.env` and fill in values
3. `npm install`
4. `npm run dev` — opens at http://localhost:5173

## Environment Variables

See `.env.example`. All server-side vars go in Railway. Never commit `.env`.

## Commands

```bash
npm run dev       # Vite :5173 + Express :3001
npm run build     # Production build
npm start         # Run production build
npm test          # Vitest
npm run typecheck # TypeScript check
```

## Deploy

Single Railway service (`ceo-dashboard`, region us-west2). Push to `main` → auto-deploy. Express serves `dist/` in production.

Production URL: <https://ceo.billyrovzar.com>

OAuth callback (must match Google Cloud + Railway `GOOGLE_REDIRECT_URI`):
`https://ceo.billyrovzar.com/auth/google/callback`

### Smoke checks

```bash
curl -s https://ceo.billyrovzar.com/api/ready | head -c 200
# Should start with `{`. If it starts with `<!`, the SPA fallback is serving HTML
# — meaning the deploy is missing the readyRouter or routing is wrong.

curl -sI https://ceo.billyrovzar.com/auth/google/start
# Expect 302 redirect to accounts.google.com.
```

See [docs/OPERATIONS.md](docs/OPERATIONS.md) for the full ops checklist.
