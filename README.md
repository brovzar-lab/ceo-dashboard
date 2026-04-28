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

Single Railway service. Push to main → auto-deploy. Express serves `dist/` in production.
