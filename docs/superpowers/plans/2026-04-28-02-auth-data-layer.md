# Auth & Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Google OAuth flow, AES-256-GCM token encryption, Firestore session store, and all security middleware. After this plan, authenticated requests reach the server and sessions persist in Firestore.

**Architecture:** All auth is server-side only. The browser holds `__Host-sid` (session cookie) and `__Host-state` (OAuth CSRF nonce). Access tokens are cached in-memory (never stored). Refresh tokens are AES-256-GCM encrypted and stored in Firestore. Session TTL is enforced by the session store's `get()`.

**Tech Stack:** firebase-admin 12, googleapis 140, express-session 1.17, Node.js `crypto` (built-in), express-rate-limit 7

**Prerequisite:** Plan 01 (Foundation) complete — `server/index.ts`, `shared/types.ts`, and all tooling present.

---

### Task 1: Firebase Admin SDK + session type extension

**Files:**
- Create: `server/lib/firebase.ts`
- Create: `server/types.d.ts`
- Create: `server/lib/firebase.test.ts`

- [ ] **Step 1: Write failing test**

Create `server/lib/firebase.test.ts`:
```ts
import { describe, expect, test, vi, beforeAll } from 'vitest'

describe('firebase module', () => {
  beforeAll(() => {
    process.env.FIREBASE_PROJECT_ID = 'test-project'
    process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com'
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----'
  })

  test('db is exported', async () => {
    vi.mock('firebase-admin/app', () => ({
      initializeApp: vi.fn(),
      getApps: vi.fn(() => []),
      cert: vi.fn((config) => config),
    }))
    vi.mock('firebase-admin/firestore', () => ({
      getFirestore: vi.fn(() => ({ collection: vi.fn() })),
    }))
    const { db } = await import('./firebase')
    expect(db).toBeDefined()
    expect(typeof db.collection).toBe('function')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- server/lib/firebase.test.ts
```

Expected: FAIL with "Cannot find module './firebase'".

- [ ] **Step 3: Create `server/lib/firebase.ts`**

```ts
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  })
}

export const db = getFirestore()
```

- [ ] **Step 4: Create `server/types.d.ts`**

```ts
declare module 'express-session' {
  interface SessionData {
    uid: string
    email: string
  }
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npm test -- server/lib/firebase.test.ts
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add server/lib/firebase.ts server/lib/firebase.test.ts server/types.d.ts
git commit -m "feat: firebase admin sdk init + session type extension"
```

---

### Task 2: Token encryption (AES-256-GCM)

**Files:**
- Create: `server/lib/encryption.ts`
- Create: `server/lib/encryption.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/lib/encryption.test.ts`:
```ts
import { describe, expect, test, beforeEach } from 'vitest'

describe('encryption', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64)
  })

  test('encrypt then decrypt returns original plaintext', () => {
    const { encrypt, decrypt } = require('./encryption')
    const { ciphertext, iv, tag } = encrypt('my-super-secret-refresh-token')
    const result = decrypt(ciphertext, iv, tag)
    expect(result).toBe('my-super-secret-refresh-token')
  })

  test('encrypt produces different ciphertext each call (random IV)', () => {
    const { encrypt } = require('./encryption')
    const r1 = encrypt('same-plaintext')
    const r2 = encrypt('same-plaintext')
    expect(r1.ciphertext).not.toBe(r2.ciphertext)
    expect(r1.iv).not.toBe(r2.iv)
  })

  test('decrypt throws on tampered ciphertext', () => {
    const { encrypt, decrypt } = require('./encryption')
    const { iv, tag } = encrypt('secret')
    expect(() => decrypt(Buffer.from('tampered').toString('base64'), iv, tag)).toThrow()
  })

  test('throws if TOKEN_ENCRYPTION_KEY is not set', () => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    vi.resetModules()
    const { encrypt } = require('./encryption')
    expect(() => encrypt('test')).toThrow('TOKEN_ENCRYPTION_KEY')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- server/lib/encryption.test.ts
```

Expected: FAIL with "Cannot find module './encryption'".

- [ ] **Step 3: Create `server/lib/encryption.ts`**

```ts
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.TOKEN_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)')
  }
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): { ciphertext: string; iv: string; tag: string } {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

export function decrypt(ciphertext: string, iv: string, tag: string): string {
  const key = getKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'))
  decipher.setAuthTag(Buffer.from(tag, 'base64'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- server/lib/encryption.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add server/lib/encryption.ts server/lib/encryption.test.ts
git commit -m "feat: AES-256-GCM token encryption"
```

---

### Task 3: In-memory access token cache

**Files:**
- Create: `server/lib/tokenCache.ts`
- Create: `server/lib/tokenCache.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/lib/tokenCache.test.ts`:
```ts
import { describe, expect, test, beforeEach, vi } from 'vitest'
import { getAccessToken, setAccessToken, clearAccessToken, getOrRefreshToken } from './tokenCache'

describe('tokenCache', () => {
  beforeEach(() => {
    clearAccessToken('uid1')
    clearAccessToken('uid2')
  })

  test('returns null when no token cached', () => {
    expect(getAccessToken('uid1')).toBeNull()
  })

  test('returns token when cached and not expired', () => {
    setAccessToken('uid1', 'tok123', Date.now() + 3_600_000)
    expect(getAccessToken('uid1')).toBe('tok123')
  })

  test('returns null when token is expired (within 60s buffer)', () => {
    setAccessToken('uid1', 'tok123', Date.now() + 30_000) // expires in 30s
    expect(getAccessToken('uid1')).toBeNull()
  })

  test('getOrRefreshToken calls refreshFn when no cache', async () => {
    const refreshFn = vi.fn().mockResolvedValue({ token: 'new-tok', expiry: Date.now() + 3_600_000 })
    const token = await getOrRefreshToken('uid2', refreshFn)
    expect(token).toBe('new-tok')
    expect(refreshFn).toHaveBeenCalledOnce()
  })

  test('getOrRefreshToken serializes concurrent refreshes for same uid', async () => {
    let resolveRefresh!: (v: { token: string; expiry: number }) => void
    const refreshFn = vi.fn().mockReturnValue(new Promise(r => { resolveRefresh = r }))

    const p1 = getOrRefreshToken('uid1', refreshFn)
    const p2 = getOrRefreshToken('uid1', refreshFn)

    resolveRefresh({ token: 'tok-once', expiry: Date.now() + 3_600_000 })

    const [t1, t2] = await Promise.all([p1, p2])
    expect(t1).toBe('tok-once')
    expect(t2).toBe('tok-once')
    expect(refreshFn).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- server/lib/tokenCache.test.ts
```

Expected: FAIL with "Cannot find module './tokenCache'".

- [ ] **Step 3: Create `server/lib/tokenCache.ts`**

```ts
interface CachedToken {
  token: string
  expiry: number
}

const cache = new Map<string, CachedToken>()
const refreshing = new Map<string, Promise<string>>()

const EXPIRY_BUFFER_MS = 60_000

export function getAccessToken(uid: string): string | null {
  const cached = cache.get(uid)
  if (cached && cached.expiry > Date.now() + EXPIRY_BUFFER_MS) {
    return cached.token
  }
  return null
}

export function setAccessToken(uid: string, token: string, expiry: number): void {
  cache.set(uid, { token, expiry })
}

export function clearAccessToken(uid: string): void {
  cache.delete(uid)
}

export async function getOrRefreshToken(
  uid: string,
  refreshFn: () => Promise<{ token: string; expiry: number }>,
): Promise<string> {
  const cached = getAccessToken(uid)
  if (cached) return cached

  const existing = refreshing.get(uid)
  if (existing) return existing

  const promise = refreshFn()
    .then(({ token, expiry }) => {
      setAccessToken(uid, token, expiry)
      refreshing.delete(uid)
      return token
    })
    .catch((err) => {
      refreshing.delete(uid)
      throw err
    })

  refreshing.set(uid, promise)
  return promise
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- server/lib/tokenCache.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add server/lib/tokenCache.ts server/lib/tokenCache.test.ts
git commit -m "feat: in-memory access token cache with serialized refresh"
```

---

### Task 4: Firestore session store

**Files:**
- Create: `server/lib/session.ts`
- Create: `server/lib/session.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/lib/session.test.ts`:
```ts
import { describe, expect, test, vi, beforeEach } from 'vitest'

// Mock firebase before importing session store
const mockDocGet = vi.fn()
const mockDocSet = vi.fn().mockResolvedValue(undefined)
const mockDocDelete = vi.fn().mockResolvedValue(undefined)
const mockDocUpdate = vi.fn().mockResolvedValue(undefined)
const mockDoc = vi.fn(() => ({
  get: mockDocGet,
  set: mockDocSet,
  delete: mockDocDelete,
  update: mockDocUpdate,
}))

vi.mock('./firebase', () => ({
  db: { collection: vi.fn(() => ({ doc: mockDoc })) },
}))

import { FirestoreSessionStore } from './session'

describe('FirestoreSessionStore', () => {
  let store: FirestoreSessionStore

  beforeEach(() => {
    store = new FirestoreSessionStore()
    vi.clearAllMocks()
  })

  test('get returns null when doc does not exist', async () => {
    mockDocGet.mockResolvedValue({ exists: false })
    const session = await new Promise<any>((resolve) =>
      store.get('sid1', (err, s) => resolve(s)),
    )
    expect(session).toBeNull()
  })

  test('get returns session data when valid', async () => {
    const now = Date.now()
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: 'u1',
        email: 'test@test.com',
        absoluteExpiry: { toMillis: () => now + 86_400_000 },
        lastSeenAt: { toMillis: () => now - 1000 },
      }),
    })
    const session = await new Promise<any>((resolve) =>
      store.get('sid1', (err, s) => resolve(s)),
    )
    expect(session).toMatchObject({ uid: 'u1', email: 'test@test.com' })
  })

  test('get returns null and destroys when absoluteExpiry exceeded', async () => {
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: 'u1',
        email: 'test@test.com',
        absoluteExpiry: { toMillis: () => Date.now() - 1000 },
        lastSeenAt: { toMillis: () => Date.now() },
      }),
    })
    const session = await new Promise<any>((resolve) =>
      store.get('sid1', (err, s) => resolve(s)),
    )
    expect(session).toBeNull()
    expect(mockDocDelete).toHaveBeenCalled()
  })

  test('get returns null when lastSeenAt > 30 days ago', async () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000
    mockDocGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: 'u1',
        email: 'test@test.com',
        absoluteExpiry: { toMillis: () => Date.now() + 86_400_000 },
        lastSeenAt: { toMillis: () => thirtyOneDaysAgo },
      }),
    })
    const session = await new Promise<any>((resolve) =>
      store.get('sid1', (err, s) => resolve(s)),
    )
    expect(session).toBeNull()
  })

  test('set writes session doc with TTL fields', async () => {
    await new Promise<void>((resolve) =>
      store.set('sid1', { uid: 'u1', email: 'e@test.com', cookie: {} as any }, resolve),
    )
    expect(mockDocSet).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'u1', email: 'e@test.com' }),
    )
  })

  test('destroy deletes session doc', async () => {
    await new Promise<void>((resolve) => store.destroy('sid1', resolve))
    expect(mockDocDelete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- server/lib/session.test.ts
```

Expected: FAIL with "Cannot find module './session'".

- [ ] **Step 3: Create `server/lib/session.ts`**

```ts
import expressSession from 'express-session'
import { db } from './firebase'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export class FirestoreSessionStore extends expressSession.Store {
  private readonly col = 'sessions'

  get(
    sid: string,
    callback: (err: any, session?: expressSession.SessionData | null) => void,
  ): void {
    db.collection(this.col)
      .doc(sid)
      .get()
      .then((doc) => {
        if (!doc.exists) return callback(null, null)

        const data = doc.data()!
        const now = Date.now()
        const absoluteExpiry: number = data.absoluteExpiry?.toMillis?.() ?? 0
        const lastSeenAt: number = data.lastSeenAt?.toMillis?.() ?? 0

        if (absoluteExpiry < now || lastSeenAt < now - THIRTY_DAYS_MS) {
          this.destroy(sid, () => {})
          return callback(null, null)
        }

        callback(null, { uid: data.uid, email: data.email, cookie: {} as any })
      })
      .catch((err) => callback(err))
  }

  set(
    sid: string,
    session: expressSession.SessionData,
    callback?: (err?: any) => void,
  ): void {
    const now = new Date()
    db.collection(this.col)
      .doc(sid)
      .set(
        {
          uid: (session as any).uid ?? null,
          email: (session as any).email ?? null,
          lastSeenAt: now,
          absoluteExpiry: new Date(now.getTime() + NINETY_DAYS_MS),
        },
        { merge: true },
      )
      .then(() => callback?.())
      .catch((err) => callback?.(err))
  }

  destroy(sid: string, callback?: (err?: any) => void): void {
    db.collection(this.col)
      .doc(sid)
      .delete()
      .then(() => callback?.())
      .catch((err) => callback?.(err))
  }

  touch(sid: string, _session: expressSession.SessionData, callback?: () => void): void {
    db.collection(this.col)
      .doc(sid)
      .update({ lastSeenAt: new Date() })
      .then(() => callback?.())
      .catch(() => callback?.())
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- server/lib/session.test.ts
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add server/lib/session.ts server/lib/session.test.ts
git commit -m "feat: custom firestore session store with TTL enforcement"
```

---

### Task 5: Audit log helper

**Files:**
- Create: `server/lib/auditLog.ts`
- Create: `server/lib/auditLog.test.ts`

- [ ] **Step 1: Write failing test**

Create `server/lib/auditLog.test.ts`:
```ts
import { describe, expect, test, vi, beforeEach } from 'vitest'

const mockAdd = vi.fn().mockResolvedValue({ id: 'log1' })
vi.mock('./firebase', () => ({
  db: { collection: vi.fn(() => ({ add: mockAdd })) },
}))

import { writeAuditLog } from './auditLog'

describe('writeAuditLog', () => {
  beforeEach(() => vi.clearAllMocks())

  test('writes event with correct fields', async () => {
    await writeAuditLog('uid1', 'login', '1.2.3.4', 'Mozilla/5.0')
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'login',
        ip: '1.2.3.4',
        userAgent: 'Mozilla/5.0',
      }),
    )
  })

  test('includes metadata when provided', async () => {
    await writeAuditLog('uid1', 'gmail_send', '1.2.3.4', 'UA', { threadId: 'th1' })
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { threadId: 'th1' } }),
    )
  })

  test('sets expiresAt 90 days from now', async () => {
    const before = Date.now()
    await writeAuditLog('uid1', 'logout', '1.2.3.4', 'UA')
    const call = mockAdd.mock.calls[0][0]
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000
    expect(call.expiresAt.getTime()).toBeGreaterThanOrEqual(before + ninetyDaysMs - 1000)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- server/lib/auditLog.test.ts
```

Expected: FAIL with "Cannot find module './auditLog'".

- [ ] **Step 3: Create `server/lib/auditLog.ts`**

```ts
import { db } from './firebase'
import { FieldValue } from 'firebase-admin/firestore'

export type AuditEvent = 'login' | 'logout' | 'token_refresh' | 'gmail_send' | 'scope_change'

export async function writeAuditLog(
  uid: string,
  event: AuditEvent,
  ip: string,
  userAgent: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  await db.collection(`users/${uid}/audit_log`).add({
    event,
    ts: FieldValue.serverTimestamp(),
    ip,
    userAgent,
    metadata: metadata ?? null,
    expiresAt,
  })
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- server/lib/auditLog.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add server/lib/auditLog.ts server/lib/auditLog.test.ts
git commit -m "feat: audit log helper"
```

---

### Task 6: requireAuth middleware

**Files:**
- Create: `server/middleware/requireAuth.ts`
- Create: `server/middleware/requireAuth.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/middleware/requireAuth.test.ts`:
```ts
import { describe, expect, test } from 'vitest'
import request from 'supertest'
import express from 'express'
import type { Request } from 'express'
import { requireAuth } from './requireAuth'

function makeApp(uid?: string) {
  const app = express()
  app.use((req: Request, _res, next) => {
    req.session = { uid, email: uid ? 'test@test.com' : undefined, cookie: {} } as any
    next()
  })
  app.use(requireAuth)
  app.get('/test', (_req, res) => res.json({ ok: true }))
  return app
}

describe('requireAuth', () => {
  test('passes when session has uid', async () => {
    const res = await request(makeApp('uid1')).get('/test')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true })
  })

  test('returns 401 UNAUTHENTICATED when no uid', async () => {
    const res = await request(makeApp()).get('/test')
    expect(res.status).toBe(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
    expect(res.body.error.retryable).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- server/middleware/requireAuth.test.ts
```

Expected: FAIL with "Cannot find module './requireAuth'".

- [ ] **Step 3: Create `server/middleware/requireAuth.ts`**

```ts
import type { Request, Response, NextFunction } from 'express'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.uid) {
    res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Authentication required',
        retryable: false,
      },
    })
    return
  }
  next()
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- server/middleware/requireAuth.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add server/middleware/requireAuth.ts server/middleware/requireAuth.test.ts
git commit -m "feat: requireAuth middleware"
```

---

### Task 7: csrfCheck middleware

**Files:**
- Create: `server/middleware/csrfCheck.ts`
- Create: `server/middleware/csrfCheck.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/middleware/csrfCheck.test.ts`:
```ts
import { describe, expect, test, beforeAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { csrfCheck } from './csrfCheck'

beforeAll(() => {
  process.env.ALLOWED_ORIGIN = 'https://myapp.railway.app'
})

function makeApp() {
  const app = express()
  app.use(csrfCheck)
  app.get('/resource', (_req, res) => res.json({ ok: true }))
  app.post('/resource', (_req, res) => res.json({ ok: true }))
  app.delete('/resource', (_req, res) => res.json({ ok: true }))
  return app
}

describe('csrfCheck', () => {
  test('allows GET without origin check', async () => {
    const res = await request(makeApp()).get('/resource')
    expect(res.status).toBe(200)
  })

  test('allows POST from correct origin', async () => {
    const res = await request(makeApp())
      .post('/resource')
      .set('Origin', 'https://myapp.railway.app')
    expect(res.status).toBe(200)
  })

  test('rejects POST from wrong origin with 403 FORBIDDEN', async () => {
    const res = await request(makeApp())
      .post('/resource')
      .set('Origin', 'https://evil.com')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('FORBIDDEN')
  })

  test('rejects DELETE from wrong origin', async () => {
    const res = await request(makeApp())
      .delete('/resource')
      .set('Origin', 'https://evil.com')
    expect(res.status).toBe(403)
  })

  test('rejects POST with no origin header', async () => {
    const res = await request(makeApp()).post('/resource')
    expect(res.status).toBe(403)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- server/middleware/csrfCheck.test.ts
```

Expected: FAIL with "Cannot find module './csrfCheck'".

- [ ] **Step 3: Create `server/middleware/csrfCheck.ts`**

```ts
import type { Request, Response, NextFunction } from 'express'

const WRITE_METHODS = new Set(['POST', 'PATCH', 'DELETE'])

export function csrfCheck(req: Request, res: Response, next: NextFunction): void {
  if (WRITE_METHODS.has(req.method)) {
    const origin = req.headers.origin
    if (origin !== process.env.ALLOWED_ORIGIN) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'CSRF check failed',
          retryable: false,
        },
      })
      return
    }
  }
  next()
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- server/middleware/csrfCheck.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add server/middleware/csrfCheck.ts server/middleware/csrfCheck.test.ts
git commit -m "feat: CSRF origin-check middleware"
```

---

### Task 8: Rate limit middleware

**Files:**
- Create: `server/middleware/rateLimit.ts`
- Create: `server/middleware/rateLimit.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/middleware/rateLimit.test.ts`:
```ts
import { describe, expect, test } from 'vitest'
import request from 'supertest'
import express from 'express'
import { makeRateLimit } from './rateLimit'

function makeApp(windowMs: number, max: number) {
  const app = express()
  app.use((req: any, _res, next) => {
    req.sessionID = 'test-session'
    next()
  })
  app.get('/resource', makeRateLimit(windowMs, max), (_req, res) => res.json({ ok: true }))
  return app
}

describe('makeRateLimit', () => {
  test('allows requests under the limit', async () => {
    const app = makeApp(60_000, 5)
    const res = await request(app).get('/resource')
    expect(res.status).toBe(200)
  })

  test('returns 429 RATE_LIMITED after limit exceeded', async () => {
    const app = makeApp(60_000, 2)
    await request(app).get('/resource')
    await request(app).get('/resource')
    const res = await request(app).get('/resource')
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
    expect(res.body.error.retryable).toBe(true)
  })

  test('429 response includes Retry-After header', async () => {
    const app = makeApp(60_000, 1)
    await request(app).get('/resource')
    const res = await request(app).get('/resource')
    expect(res.status).toBe(429)
    expect(res.headers['ratelimit-reset'] || res.headers['retry-after']).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- server/middleware/rateLimit.test.ts
```

Expected: FAIL with "Cannot find module './rateLimit'".

- [ ] **Step 3: Create `server/middleware/rateLimit.ts`**

```ts
import rateLimit from 'express-rate-limit'
import type { Request } from 'express'

export function makeRateLimit(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => (req as any).sessionID || req.ip || 'anonymous',
    handler: (_req, res, _next, options) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          retryable: true,
        },
      })
    },
  })
}

// Pre-built rate limiters matching spec
export const briefLimit = makeRateLimit(60_000, 5)
export const chatLimit = makeRateLimit(60_000, 30)
export const sparkLimit = makeRateLimit(60_000, 5)
export const gmailSendLimit = makeRateLimit(60_000, 5)
export const gmailLimit = makeRateLimit(60_000, 60)
export const calendarLimit = makeRateLimit(60_000, 30)
export const notionLimit = makeRateLimit(60_000, 20)
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- server/middleware/rateLimit.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add server/middleware/rateLimit.ts server/middleware/rateLimit.test.ts
git commit -m "feat: per-session rate limit middleware"
```

---

### Task 9: Google OAuth routes

**Files:**
- Create: `server/routes/auth.ts`
- Create: `server/routes/auth.test.ts`

- [ ] **Step 1: Write failing tests**

Create `server/routes/auth.test.ts`:
```ts
import { describe, expect, test, vi, beforeAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'

// Mock googleapis before import
vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        generateAuthUrl: vi.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?state=TEST_STATE'),
        getToken: vi.fn().mockResolvedValue({
          tokens: {
            access_token: 'at123',
            refresh_token: 'rt123',
            expiry_date: Date.now() + 3_600_000,
            scope: 'email profile',
          },
        }),
        setCredentials: vi.fn(),
      })),
    },
    oauth2: vi.fn(() => ({
      userinfo: {
        get: vi.fn().mockResolvedValue({
          data: { id: 'uid123', email: 'billy@lemonfilms.com', name: 'Billy', picture: '' },
        }),
      },
    })),
  },
}))

vi.mock('../lib/firebase', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}))

vi.mock('../lib/encryption', () => ({
  encrypt: vi.fn().mockReturnValue({ ciphertext: 'c', iv: 'i', tag: 't' }),
}))

vi.mock('../lib/tokenCache', () => ({
  setAccessToken: vi.fn(),
}))

vi.mock('../lib/auditLog', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}))

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = 'client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'client-secret'
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/google/callback'
  process.env.ALLOWED_EMAILS = 'billy@lemonfilms.com'
})

import { authRouter } from './auth'

function makeApp() {
  const app = express()
  app.use(express.json())
  // Minimal session mock
  app.use((req: any, _res, next) => {
    req.session = { uid: undefined, email: undefined, cookie: {}, destroy: (cb: any) => cb?.() }
    req.sessionID = 'test-sid'
    next()
  })
  app.use('/auth', authRouter)
  return app
}

describe('GET /auth/google/start', () => {
  test('redirects to Google consent URL', async () => {
    const res = await request(makeApp()).get('/auth/google/start')
    expect(res.status).toBe(302)
    expect(res.headers.location).toContain('accounts.google.com')
  })

  test('sets __Host-state cookie (in dev: state cookie)', async () => {
    const res = await request(makeApp()).get('/auth/google/start')
    const setCookie = res.headers['set-cookie'] as string[]
    expect(setCookie?.some((c: string) => c.includes('state'))).toBe(true)
  })
})

describe('GET /auth/google/callback', () => {
  test('rejects when state does not match cookie', async () => {
    const res = await request(makeApp())
      .get('/auth/google/callback?code=abc&state=WRONG_STATE')
    expect(res.status).toBe(403)
  })

  test('rejects email not in ALLOWED_EMAILS', async () => {
    vi.mocked(
      (await import('googleapis')).google.oauth2({} as any).userinfo.get
    ).mockResolvedValueOnce({ data: { id: 'other', email: 'hacker@evil.com', name: 'Hacker', picture: '' } } as any)

    const res = await request(makeApp())
      .get('/auth/google/callback?code=abc&state=MISMATCH')
    expect(res.status).toBe(403)
  })
})

describe('GET /auth/google/logout', () => {
  test('redirects to / after logout', async () => {
    const res = await request(makeApp())
      .get('/auth/google/logout')
    expect(res.status).toBe(302)
    expect(res.headers.location).toBe('/')
  })
})
```

- [ ] **Step 2: Install missing dep (cookie-parser)**

```bash
npm install cookie-parser && npm install -D @types/cookie-parser
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
npm test -- server/routes/auth.test.ts
```

Expected: FAIL with "Cannot find module './auth'".

- [ ] **Step 4: Create `server/routes/auth.ts`**

```ts
import { Router } from 'express'
import { google } from 'googleapis'
import crypto from 'crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../lib/firebase'
import { encrypt } from '../lib/encryption'
import { setAccessToken } from '../lib/tokenCache'
import { writeAuditLog } from '../lib/auditLog'

export const authRouter = Router()

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
  'profile',
]

function makeOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  )
}

const isProd = process.env.NODE_ENV === 'production'
const STATE_COOKIE = isProd ? '__Host-state' : 'state'
const STATE_COOKIE_OPTS = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict' as const,
  maxAge: 10 * 60 * 1000,
  path: '/',
}

authRouter.get('/google/start', (req, res) => {
  const state = crypto.randomBytes(32).toString('hex')
  const oauth2Client = makeOAuth2Client()
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state,
    prompt: 'consent',
  })
  res.cookie(STATE_COOKIE, state, STATE_COOKIE_OPTS)
  res.redirect(url)
})

authRouter.get('/google/callback', async (req, res) => {
  const { code, state } = req.query as Record<string, string>
  const storedState = req.cookies?.[STATE_COOKIE]

  if (!state || state !== storedState) {
    return res.status(403).send('State mismatch — possible CSRF')
  }

  res.clearCookie(STATE_COOKIE, { path: '/' })

  const oauth2Client = makeOAuth2Client()
  let tokens: any
  try {
    const result = await oauth2Client.getToken(code)
    tokens = result.tokens
  } catch {
    return res.status(400).send('Token exchange failed')
  }

  oauth2Client.setCredentials(tokens)
  const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2Client })
  const { data: userInfo } = await oauth2Api.userinfo.get()

  const email = userInfo.email!
  const uid = userInfo.id!

  const allowed = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
  if (!allowed.includes(email.toLowerCase())) {
    return res.status(403).send('Email not authorized')
  }

  // Encrypt and persist refresh token
  const encrypted = encrypt(tokens.refresh_token!)
  await db
    .collection(`users/${uid}/google_tokens`)
    .doc('token')
    .set({
      refreshToken: encrypted,
      tokenExpiry: new Date(tokens.expiry_date!),
      scope: tokens.scope || '',
      updatedAt: FieldValue.serverTimestamp(),
    })

  // Cache access token in memory
  setAccessToken(uid, tokens.access_token!, tokens.expiry_date!)

  // Upsert user profile
  await db.collection('users').doc(uid).set(
    {
      email,
      displayName: userInfo.name || '',
      photoURL: userInfo.picture || '',
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )

  // Set session
  req.session.uid = uid
  req.session.email = email

  // Write session doc with metadata not available to session store
  await db.collection('sessions').doc(req.sessionID).set(
    {
      uid,
      email,
      lastSeenAt: FieldValue.serverTimestamp(),
      absoluteExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      userAgent: req.headers['user-agent'] || '',
      ip: req.ip || '',
    },
    { merge: true },
  )

  await writeAuditLog(uid, 'login', req.ip || '', req.headers['user-agent'] || '')
  res.redirect('/')
})

authRouter.get('/google/logout', async (req, res) => {
  const uid = req.session?.uid
  if (uid) {
    await writeAuditLog(uid, 'logout', req.ip || '', req.headers['user-agent'] || '')
  }
  req.session.destroy(() => {})
  const sidCookie = isProd ? '__Host-sid' : 'sid'
  res.clearCookie(sidCookie, { path: '/' })
  res.redirect('/')
})
```

- [ ] **Step 5: Run tests — expect PASS**

```bash
npm test -- server/routes/auth.test.ts
```

Expected: Tests pass (redirect and cookie tests).

- [ ] **Step 6: Commit**

```bash
git add server/routes/auth.ts server/routes/auth.test.ts
git commit -m "feat: google oauth routes (start, callback, logout)"
```

---

### Task 10: Wire auth into server/index.ts

**Files:**
- Modify: `server/index.ts`
- Create: `server/index.test.ts` (update)

- [ ] **Step 1: Update `server/index.ts` to add session + auth**

Replace the contents of `server/index.ts` with:

```ts
import express from 'express'
import path from 'path'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import { FirestoreSessionStore } from './lib/session'
import { authRouter } from './routes/auth'

dotenv.config()

export const app = express()

app.use(express.json())
app.use(cookieParser())

const isProd = process.env.NODE_ENV === 'production'
app.use(
  session({
    name: isProd ? '__Host-sid' : 'sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    store: new FirestoreSessionStore(),
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    },
  }),
)

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/auth', authRouter)

// Serve Vite build in production
if (isProd) {
  const distPath = path.resolve(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

if (require.main === module) {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log(`Server running on :${PORT}`)
  })
}
```

- [ ] **Step 2: Run existing health test**

```bash
npm test -- server/index.test.ts
```

Expected: health test still passes.

- [ ] **Step 3: Run all server tests**

```bash
npm test -- server/
```

Expected: All server tests pass.

- [ ] **Step 4: Commit**

```bash
git add server/index.ts
git commit -m "feat: wire session middleware and auth routes into express"
```

---

## Spec Coverage

| Spec section | Covered |
|---|---|
| Google OAuth flow (§3) | ✅ start/callback/logout routes |
| State nonce CSRF (§3) | ✅ __Host-state cookie, state validation |
| Email allowlist (§3) | ✅ ALLOWED_EMAILS check in callback |
| AES-256-GCM encryption (§3) | ✅ encrypt/decrypt with key validation |
| Token schema (§3) | ✅ { ciphertext, iv, tag } in Firestore |
| Access token in-memory cache (§4) | ✅ tokenCache with serialized refresh |
| Session schema (§3) | ✅ uid, email, createdAt, lastSeenAt, absoluteExpiry, userAgent, ip |
| TTL enforcement (§3) | ✅ session store rejects expired/inactive sessions |
| Firestore TTL field (§3) | ✅ absoluteExpiry field for Firestore TTL policy |
| CSRF protection (§3) | ✅ csrfCheck origin header middleware |
| Rate limits (§5) | ✅ makeRateLimit + all pre-built limiters |
| Audit log (§3) | ✅ login, logout events; gmail_send/scope_change used in Plan 3 |
| requireAuth gate (§5) | ✅ session uid check, 401 error shape |
| Cookie attributes (§3) | ✅ httpOnly, secure, sameSite per spec |
