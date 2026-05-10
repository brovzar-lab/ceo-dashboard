# Operations

One app. One Railway service. One canonical URL.

## Topology

- **App**: full-stack Vite + React + Express, single repo (`brovzar-lab/ceo-dashboard`).
- **Hosting**: Railway, region `us-west2`, service `ceo-dashboard`.
- **Canonical URL**: <https://ceo.billyrovzar.com>
- **Legacy domain**: `dashboard.billyrovzar.com` may still be attached to the same service. Same code, same bundle. Two URLs ≠ two apps unless Railway shows two different services.

## Required Railway env (production)

Server-side only — never commit. Public/build-time `VITE_*` vars are baked at build time, not read at runtime.

| Var | Value |
|---|---|
| `GOOGLE_REDIRECT_URI` | `https://ceo.billyrovzar.com/auth/google/callback` |
| `ALLOWED_ORIGIN` | `https://ceo.billyrovzar.com` |
| `ALLOWED_EMAILS` | `billy@lemonfilms.com` (comma-separated) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | from Google Cloud OAuth client |
| `SESSION_SECRET` | 32+ random bytes |
| `TOKEN_ENCRYPTION_KEY` | 32 random bytes (base64), never written to Firestore |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | service account |
| `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `NOTION_API_KEY`, `NOTION_BRAIN_PAGE_ID` | integrations |
| `VITE_NEW_DASHBOARD` | `true` for the editorial UI; `false` for legacy 3-column. Build-time. |

Changing `VITE_NEW_DASHBOARD` requires a **redeploy** so Vite re-bakes the bundle. A runtime env change alone will not switch the layout.

## OAuth checklist

Callback path is `/auth/google/callback` (NOT `/auth/callback`).

1. Google Cloud Console → OAuth client → Authorized redirect URIs includes `https://ceo.billyrovzar.com/auth/google/callback`.
2. Railway `GOOGLE_REDIRECT_URI` matches exactly.
3. Always start from **Sign in** (`/auth/google/start`). Refreshing or bookmarking `/auth/google/callback` directly will hit it without `code`/`state` and log `got: undefined` → 403. That is expected behavior, not a bug.
4. State is stored server-side in the session (Firestore-backed), not in a cookie named `state`.

### Reading auth logs

| Log | Meaning |
|---|---|
| `stored: <hex> got: <hex>` matching | Normal callback, OAuth proceeding. |
| `stored: <hex> got: undefined` | Callback URL hit without Google params. User refreshed/bookmarked the callback, or an extension stripped the query string. Not a session bug. |
| `State mismatch` 403 | Session still had old `oauthState`, but `state` query param doesn't match. Re-trigger from `/auth/google/start`. |

## Smoke checks

```bash
# Should start with `{`. If `<!`, the SPA catch-all is serving HTML and the
# /api/ready route isn't registered in the live build.
curl -s https://ceo.billyrovzar.com/api/ready | head -c 200

# 302 to accounts.google.com.
curl -sI https://ceo.billyrovzar.com/auth/google/start
```

## Layout flag

`src/components/Dashboard.tsx` branches on `import.meta.env.VITE_NEW_DASHBOARD`:

- `true` → editorial UI (EditorialMasthead, MorningOverview, AudioPlayer, etc.).
- `false` → legacy 3-column (BriefPanel, NextUpBar, Tasks/Inbox/Brain).

Hostname does **not** select the layout — only the bundle that was built. If `ceo.billyrovzar.com` shows the new UI and `dashboard.billyrovzar.com` shows the legacy one, they are pointing at different deployments or one has stale CDN/browser cache.

## Vault / Brain

- Indexer parses YAML frontmatter. Unquoted values containing `:` (e.g. `kill-reason: Board decision: killed`) break parsing — wrap the value in quotes or use a literal block (`|`).
- A frontmatter parse failure skips that file from the index until fixed. Other files still index.
- `[brain] Updated: …` after `vault-sync` confirms the watcher picked up a change.

## Log noise (safe to ignore)

- `npm warn config production` — npm/Railway deprecation warning.
- `Cloning into '/app/vault'...` logged as error — git writes progress to stderr; the followup `Vault ready` line confirms success.
- Scanner bot 200s on `/.env`, `/settings.py`, etc. — SPA catch-all returns `index.html` for unknown paths. Hardening with WAF / Cloudflare rules or explicit 404 handlers is optional.

## Domain cleanup (optional)

When ready to retire `dashboard.billyrovzar.com`:

1. Add a redirect (Cloudflare page rule or Railway custom domain redirect) `dashboard.billyrovzar.com/*` → `https://ceo.billyrovzar.com/$1`.
2. Once traffic drains, detach the legacy domain from the Railway service.

## Handoff hygiene

Future handoffs should include the **branch name + commit SHA after push**, or explicitly state "local-only, not pushed." A handoff describing changes that only exist in an uncommitted Cursor workspace will not be reproducible from a fresh clone.
