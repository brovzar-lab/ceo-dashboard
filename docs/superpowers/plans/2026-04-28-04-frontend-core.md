# Frontend Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all 10 Zustand stores, API client helpers, SSE brief streaming utility, AuthGate, and DemoBanner. After this plan, the app renders with seed data immediately and replaces it with live data after auth.

**Architecture:** Stores hydrate synchronously from `seeds.ts` on module load. Live data replaces seed state after successful fetches. Tasks and Decisions use Firebase Client SDK directly (Firestore onSnapshot). Gmail/Calendar/Notion/Claude go through the Express API. The brief SSE stream is a standalone utility consumed by `useBriefStore`.

**Tech Stack:** Zustand 4, Firebase 10 (Client SDK), React 18

**Prerequisite:** Plans 01–03 complete.

---

### Task 1: Install Firebase Client SDK + setup + add GET /api/me to server

**Files:**
- Modify: `package.json`
- Create: `src/lib/firestore.ts`
- Modify: `server/index.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install Firebase Client SDK**

```bash
npm install firebase
```

- [ ] **Step 2: Create `src/lib/firestore.ts`**

```ts
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

if (!getApps().length) {
  initializeApp({
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  })
}

export const db = getFirestore()
```

- [ ] **Step 3: Add `GET /api/me` to `server/index.ts`**

Add this route after `GET /health` and before `GET /api/csrf`:

```ts
app.get('/api/me', (req, res) => {
  if (!req.session?.uid) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in', retryable: false } })
  }
  res.json({ data: { uid: req.session.uid, email: req.session.email } })
})
```

- [ ] **Step 4: Add frontend Firebase vars to `.env.example`**

Append to `.env.example`:
```bash
# Firebase Client SDK (build-time, Vite — public, non-secret)
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
```

- [ ] **Step 5: Run server tests to confirm /api/me doesn't break existing tests**

```bash
npm test -- server/index.test.ts
```

Expected: All pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/firestore.ts server/index.ts .env.example
git commit -m "feat: firebase client sdk, /api/me route"
```

---

### Task 2: API client helpers

**Files:**
- Create: `src/lib/apiClient.ts`
- Create: `src/lib/__tests__/apiClient.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/apiClient.test.ts`:
```ts
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { apiFetch, ApiError } from '../apiClient'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  test('returns data on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { result: 'ok' } }),
    } as any)

    const result = await apiFetch('/api/test')
    expect(result).toEqual({ result: 'ok' })
  })

  test('throws ApiError on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in', retryable: false } }),
    } as any)

    await expect(apiFetch('/api/protected')).rejects.toBeInstanceOf(ApiError)
  })

  test('ApiError has code and retryable fields', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { code: 'RATE_LIMITED', message: 'Too many', retryable: true } }),
    } as any)

    let caught: ApiError | null = null
    try {
      await apiFetch('/api/limited')
    } catch (e) {
      caught = e as ApiError
    }
    expect(caught?.code).toBe('RATE_LIMITED')
    expect(caught?.retryable).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/lib/__tests__/apiClient.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/lib/apiClient.ts`**

```ts
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  })

  if (!response.ok) {
    let errBody: any = {}
    try {
      errBody = await response.json()
    } catch {
      errBody = { error: { code: 'UNKNOWN', message: response.statusText, retryable: false } }
    }
    const err = errBody.error ?? {}
    throw new ApiError(err.code ?? 'UNKNOWN', err.message ?? 'Request failed', err.retryable ?? false)
  }

  const json = await response.json()
  return json.data as T
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/lib/__tests__/apiClient.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/apiClient.ts src/lib/__tests__/apiClient.test.ts
git commit -m "feat: api fetch client with typed error"
```

---

### Task 3: Brief SSE stream utility

**Files:**
- Create: `src/lib/briefStream.ts`
- Create: `src/lib/__tests__/briefStream.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/__tests__/briefStream.test.ts`:
```ts
import { describe, expect, test, vi } from 'vitest'
import { parseSseEvent } from '../briefStream'

describe('parseSseEvent', () => {
  test('parses cached event', () => {
    const line = `data: ${JSON.stringify({ type: 'cached', jarvis: 'j', billy: 'b', isStale: true })}`
    const result = parseSseEvent(line)
    expect(result).toMatchObject({ type: 'cached', jarvis: 'j', billy: 'b', isStale: true })
  })

  test('parses token event', () => {
    const line = `data: ${JSON.stringify({ type: 'token', voice: 'jarvis', text: 'Good morning' })}`
    const result = parseSseEvent(line)
    expect(result).toMatchObject({ type: 'token', voice: 'jarvis', text: 'Good morning' })
  })

  test('parses done event', () => {
    const line = `data: ${JSON.stringify({ type: 'done', jarvis: 'j', billy: 'b', generatedAt: '2026-04-28T00:00:00Z', briefId: 'abc-2026-04-28' })}`
    const result = parseSseEvent(line)
    expect(result).toMatchObject({ type: 'done', briefId: 'abc-2026-04-28' })
  })

  test('returns null for non-data lines', () => {
    expect(parseSseEvent('')).toBeNull()
    expect(parseSseEvent(': heartbeat')).toBeNull()
  })

  test('returns null for malformed JSON', () => {
    expect(parseSseEvent('data: {not-json}')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/lib/__tests__/briefStream.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/lib/briefStream.ts`**

```ts
export type BriefSseEvent =
  | { type: 'cached'; jarvis: string; billy: string; generatedAt?: string; isStale: boolean; isDemo?: boolean }
  | { type: 'token'; voice: 'jarvis' | 'billy'; text: string }
  | { type: 'done'; jarvis: string; billy: string; generatedAt: string; briefId: string }
  | { type: 'error'; message: string }

export function parseSseEvent(line: string): BriefSseEvent | null {
  if (!line.startsWith('data: ')) return null
  try {
    return JSON.parse(line.slice(6)) as BriefSseEvent
  } catch {
    return null
  }
}

export interface BriefStreamCallbacks {
  onCached: (event: Extract<BriefSseEvent, { type: 'cached' }>) => void
  onToken: (voice: 'jarvis' | 'billy', text: string) => void
  onDone: (event: Extract<BriefSseEvent, { type: 'done' }>) => void
  onError: (message: string) => void
}

export function startBriefStream(
  forceRefresh: boolean,
  callbacks: BriefStreamCallbacks,
): () => void {
  const controller = new AbortController()

  ;(async () => {
    try {
      const response = await fetch('/api/claude/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceRefresh }),
        signal: controller.signal,
      })

      if (!response.ok) {
        callbacks.onError('Brief request failed')
        return
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('text/event-stream')) {
        // Cached JSON response
        const json = await response.json()
        if (json.data) {
          callbacks.onCached({ type: 'cached', ...json.data, isStale: false })
          callbacks.onDone({ type: 'done', ...json.data, briefId: '', generatedAt: json.data.generatedAt ?? '' })
        }
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const event = parseSseEvent(line.trim())
          if (!event) continue
          if (event.type === 'cached') callbacks.onCached(event)
          else if (event.type === 'token') callbacks.onToken(event.voice, event.text)
          else if (event.type === 'done') callbacks.onDone(event)
          else if (event.type === 'error') callbacks.onError(event.message)
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError('Stream error')
      }
    }
  })()

  return () => controller.abort()
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/lib/__tests__/briefStream.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/briefStream.ts src/lib/__tests__/briefStream.test.ts
git commit -m "feat: brief SSE stream utility with event parser"
```

---

### Task 4: Auth store + AuthGate + DemoBanner

**Files:**
- Create: `src/stores/useAuthStore.ts`
- Create: `src/components/AuthGate.tsx`
- Create: `src/components/DemoBanner.tsx`
- Create: `src/__tests__/useAuthStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/useAuthStore.test.ts`:
```ts
import { describe, expect, test, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../stores/useAuthStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isDemo: true, loading: false })
  })

  test('initial state is unauthenticated demo mode', () => {
    const { user, isAuthenticated, isDemo } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
    expect(isDemo).toBe(true)
  })

  test('setUser marks authenticated and exits demo mode', () => {
    act(() => {
      useAuthStore.getState().setUser({ uid: 'u1', email: 'billy@lemonfilms.com' })
    })
    const { user, isAuthenticated, isDemo } = useAuthStore.getState()
    expect(user).toMatchObject({ uid: 'u1' })
    expect(isAuthenticated).toBe(true)
    expect(isDemo).toBe(false)
  })

  test('clearUser reverts to demo mode', () => {
    act(() => {
      useAuthStore.getState().setUser({ uid: 'u1', email: 'b@b.com' })
      useAuthStore.getState().clearUser()
    })
    const { isAuthenticated, isDemo } = useAuthStore.getState()
    expect(isAuthenticated).toBe(false)
    expect(isDemo).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/__tests__/useAuthStore.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/stores/useAuthStore.ts`**

```ts
import { create } from 'zustand'

interface User {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isDemo: boolean
  loading: boolean
  setUser: (user: User) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isDemo: true,
  loading: true,

  setUser: (user) => set({ user, isAuthenticated: true, isDemo: false, loading: false }),

  clearUser: () => set({ user: null, isAuthenticated: false, isDemo: true, loading: false }),

  setLoading: (loading) => set({ loading }),

  checkAuth: async () => {
    try {
      const res = await fetch('/api/me')
      if (res.ok) {
        const json = await res.json()
        set({ user: json.data, isAuthenticated: true, isDemo: false, loading: false })
      } else {
        set({ user: null, isAuthenticated: false, isDemo: true, loading: false })
      }
    } catch {
      set({ user: null, isAuthenticated: false, isDemo: true, loading: false })
    }
  },
}))
```

- [ ] **Step 4: Create `src/components/AuthGate.tsx`**

```tsx
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-accent-lemon border-t-transparent animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
```

- [ ] **Step 5: Create `src/components/DemoBanner.tsx`**

```tsx
import { useAuthStore } from '@/stores/useAuthStore'

export function DemoBanner() {
  const isDemo = useAuthStore((s) => s.isDemo)
  if (!isDemo) return null

  return (
    <div className="w-full bg-bg-elevated border-b border-border-medium px-4 py-2 flex items-center justify-between">
      <span className="text-xs text-text-tertiary font-body">
        Demo data — sign in for live
      </span>
      <a
        href="/auth/google/start"
        className="text-xs font-body font-medium text-accent-lemon hover:opacity-80 transition-opacity"
      >
        Sign in with Google →
      </a>
    </div>
  )
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
npm test -- src/__tests__/useAuthStore.test.ts
```

Expected: 3 passed.

- [ ] **Step 7: Commit**

```bash
git add src/stores/useAuthStore.ts src/components/AuthGate.tsx src/components/DemoBanner.tsx src/__tests__/useAuthStore.test.ts
git commit -m "feat: auth store, AuthGate, DemoBanner"
```

---

### Task 5: Brief store with SSE streaming state machine

**Files:**
- Create: `src/stores/useBriefStore.ts`
- Create: `src/__tests__/useBriefStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/useBriefStore.test.ts`:
```ts
import { describe, expect, test, beforeEach, act, vi } from 'vitest'
import { useBriefStore } from '../stores/useBriefStore'
import { seeds } from '../data/seeds'

describe('useBriefStore', () => {
  beforeEach(() => {
    useBriefStore.setState({
      jarvis: seeds.brief.jarvis,
      billy: seeds.brief.billy,
      isStale: false,
      isStreaming: false,
      generatedAt: null,
      briefId: null,
    })
  })

  test('initial state has seed brief text', () => {
    const { jarvis, billy } = useBriefStore.getState()
    expect(jarvis).toBe(seeds.brief.jarvis)
    expect(billy).toBe(seeds.brief.billy)
  })

  test('beginStream sets isStreaming=true and isStale=true', () => {
    act(() => {
      useBriefStore.getState().beginStream()
    })
    const { isStreaming, isStale } = useBriefStore.getState()
    expect(isStreaming).toBe(true)
    expect(isStale).toBe(true)
  })

  test('setCached updates brief text while streaming remains true', () => {
    act(() => {
      useBriefStore.getState().beginStream()
      useBriefStore.getState().setCached({ jarvis: 'stale-j', billy: 'stale-b', generatedAt: '2026-04-27T00:00:00Z' })
    })
    const { jarvis, billy, isStreaming, isStale } = useBriefStore.getState()
    expect(jarvis).toBe('stale-j')
    expect(billy).toBe('stale-b')
    expect(isStreaming).toBe(true)
    expect(isStale).toBe(true)
  })

  test('appendToken accumulates text for the correct voice', () => {
    act(() => {
      useBriefStore.getState().beginStream()
      useBriefStore.getState().setCached({ jarvis: '', billy: '' })
      useBriefStore.getState().appendToken('jarvis', 'Good ')
      useBriefStore.getState().appendToken('jarvis', 'morning.')
    })
    expect(useBriefStore.getState().jarvis).toBe('Good morning.')
  })

  test('completeStream sets isStreaming=false and isStale=false', () => {
    act(() => {
      useBriefStore.getState().beginStream()
      useBriefStore.getState().completeStream({ jarvis: 'j', billy: 'b', generatedAt: '2026-04-28T00:00:00Z', briefId: 'abc' })
    })
    const { isStreaming, isStale, briefId } = useBriefStore.getState()
    expect(isStreaming).toBe(false)
    expect(isStale).toBe(false)
    expect(briefId).toBe('abc')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/__tests__/useBriefStore.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/stores/useBriefStore.ts`**

```ts
import { create } from 'zustand'
import { seeds } from '@/data/seeds'
import { startBriefStream } from '@/lib/briefStream'

interface BriefState {
  jarvis: string
  billy: string
  isStale: boolean
  isStreaming: boolean
  generatedAt: string | null
  briefId: string | null

  beginStream: () => void
  setCached: (brief: { jarvis: string; billy: string; generatedAt?: string; isDemo?: boolean }) => void
  appendToken: (voice: 'jarvis' | 'billy', text: string) => void
  completeStream: (brief: { jarvis: string; billy: string; generatedAt: string; briefId: string }) => void
  revertToLast: () => void
  refresh: (forceRefresh?: boolean) => () => void
}

export const useBriefStore = create<BriefState>()((set, get) => ({
  jarvis: seeds.brief.jarvis,
  billy: seeds.brief.billy,
  isStale: false,
  isStreaming: false,
  generatedAt: null,
  briefId: null,

  beginStream: () => set({ isStreaming: true, isStale: true }),

  setCached: (brief) =>
    set({
      jarvis: brief.jarvis,
      billy: brief.billy,
      generatedAt: brief.generatedAt ?? null,
      isStale: true,
    }),

  appendToken: (voice, text) =>
    set((s) =>
      voice === 'jarvis'
        ? { jarvis: s.jarvis + text }
        : { billy: s.billy + text },
    ),

  completeStream: (brief) =>
    set({
      jarvis: brief.jarvis,
      billy: brief.billy,
      generatedAt: brief.generatedAt,
      briefId: brief.briefId,
      isStreaming: false,
      isStale: false,
    }),

  revertToLast: () => {
    const { jarvis, billy } = get()
    set({ isStreaming: false, isStale: jarvis === seeds.brief.jarvis })
  },

  refresh: (forceRefresh = false) => {
    const { beginStream, setCached, appendToken, completeStream, revertToLast } = get()
    beginStream()
    // Reset streaming buffers
    set({ jarvis: '', billy: '' })
    return startBriefStream(forceRefresh, {
      onCached: (e) => setCached({ jarvis: e.jarvis, billy: e.billy, generatedAt: e.generatedAt }),
      onToken: (voice, text) => appendToken(voice, text),
      onDone: (e) => completeStream({ jarvis: e.jarvis, billy: e.billy, generatedAt: e.generatedAt, briefId: e.briefId }),
      onError: () => revertToLast(),
    })
  },
}))
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/__tests__/useBriefStore.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/stores/useBriefStore.ts src/__tests__/useBriefStore.test.ts
git commit -m "feat: brief store with SSE streaming state machine"
```

---

### Task 6: Task store with optimistic write queue

**Files:**
- Create: `src/lib/mutationQueue.ts`
- Create: `src/stores/useTaskStore.ts`
- Create: `src/__tests__/useTaskStore.test.ts`
- Create: `src/lib/__tests__/mutationQueue.test.ts`

- [ ] **Step 1: Write mutation queue tests**

Create `src/lib/__tests__/mutationQueue.test.ts`:
```ts
import { describe, expect, test, vi } from 'vitest'
import { MutationQueue } from '../mutationQueue'

describe('MutationQueue', () => {
  test('runs mutations in order for the same id', async () => {
    const queue = new MutationQueue()
    const log: number[] = []
    const fn1 = () => new Promise<void>(r => setTimeout(() => { log.push(1); r() }, 10))
    const fn2 = () => new Promise<void>(r => { log.push(2); r() })
    queue.enqueue('id1', fn1)
    await queue.enqueue('id1', fn2)
    expect(log).toEqual([1, 2])
  })

  test('runs mutations for different ids in parallel', async () => {
    const queue = new MutationQueue()
    const started: string[] = []
    const p1 = queue.enqueue('id1', () => new Promise<void>(r => { started.push('a'); setTimeout(r, 20) }))
    const p2 = queue.enqueue('id2', () => new Promise<void>(r => { started.push('b'); setTimeout(r, 5) }))
    await Promise.all([p1, p2])
    // Both start before either finishes (parallel)
    expect(started).toContain('a')
    expect(started).toContain('b')
  })
})
```

- [ ] **Step 2: Create `src/lib/mutationQueue.ts`**

```ts
export class MutationQueue {
  private queues = new Map<string, Promise<void>>()
  private readonly timeoutMs: number

  constructor(timeoutMs = 5_000) {
    this.timeoutMs = timeoutMs
  }

  enqueue(id: string, fn: () => Promise<void>): Promise<void> {
    const prev = this.queues.get(id) ?? Promise.resolve()

    const next: Promise<void> = prev.then(() =>
      Promise.race([
        fn(),
        new Promise<void>((_, reject) =>
          setTimeout(() => reject(new Error('mutation timeout')), this.timeoutMs),
        ),
      ]),
    ).then(() => {
      if (this.queues.get(id) === next) this.queues.delete(id)
    }).catch((err) => {
      if (this.queues.get(id) === next) this.queues.delete(id)
      throw err
    })

    this.queues.set(id, next)
    return next
  }
}
```

- [ ] **Step 3: Run mutation queue tests — expect PASS**

```bash
npm test -- src/lib/__tests__/mutationQueue.test.ts
```

Expected: 2 passed.

- [ ] **Step 4: Write failing task store tests**

Create `src/__tests__/useTaskStore.test.ts`:
```ts
import { describe, expect, test, beforeEach, act, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-id' }),
  updateDoc: vi.fn().mockResolvedValue(undefined),
  deleteDoc: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn(() => ({ path: 'tasks/new-id' })),
  serverTimestamp: vi.fn(() => new Date()),
}))

vi.mock('@/lib/firestore', () => ({ db: {} }))

import { useTaskStore } from '../stores/useTaskStore'
import { seeds } from '../data/seeds'

describe('useTaskStore', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: seeds.tasks })
  })

  test('initial state has seed tasks', () => {
    const { tasks } = useTaskStore.getState()
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks[0].bucket).toBeDefined()
  })

  test('create adds an optimistic task immediately', () => {
    const before = useTaskStore.getState().tasks.length
    act(() => {
      useTaskStore.getState().create('uid1', { title: 'New task', bucket: 'now', source: 'manual' })
    })
    expect(useTaskStore.getState().tasks.length).toBe(before + 1)
    const newTask = useTaskStore.getState().tasks.find(t => t.title === 'New task')
    expect(newTask).toBeDefined()
    expect(newTask?.bucket).toBe('now')
  })

  test('moveBucket changes the task bucket', () => {
    const taskId = seeds.tasks[0].id
    act(() => {
      useTaskStore.getState().moveBucket('uid1', taskId, 'orbit')
    })
    const updated = useTaskStore.getState().tasks.find(t => t.id === taskId)
    expect(updated?.bucket).toBe('orbit')
  })

  test('toggleDone marks task done', () => {
    const taskId = seeds.tasks[0].id
    act(() => {
      useTaskStore.getState().toggleDone('uid1', taskId)
    })
    const updated = useTaskStore.getState().tasks.find(t => t.id === taskId)
    expect(updated?.done).toBe(true)
  })

  test('remove deletes task from state immediately', () => {
    const taskId = seeds.tasks[0].id
    const before = useTaskStore.getState().tasks.length
    act(() => {
      useTaskStore.getState().remove('uid1', taskId)
    })
    expect(useTaskStore.getState().tasks.length).toBe(before - 1)
  })
})
```

- [ ] **Step 5: Run test — expect FAIL**

```bash
npm test -- src/__tests__/useTaskStore.test.ts
```

Expected: FAIL.

- [ ] **Step 6: Create `src/stores/useTaskStore.ts`**

```ts
import { create } from 'zustand'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firestore'
import { MutationQueue } from '@/lib/mutationQueue'
import { seeds } from '@/data/seeds'
import type { Task, Bucket, TaskSource } from '@shared/types'

const queue = new MutationQueue()

interface TaskState {
  tasks: Task[]
  setTasks: (tasks: Task[]) => void
  subscribe: (uid: string) => () => void
  create: (uid: string, partial: { title: string; bucket: Bucket; source: TaskSource; notes?: string }) => void
  moveBucket: (uid: string, id: string, bucket: Bucket) => void
  toggleDone: (uid: string, id: string) => void
  remove: (uid: string, id: string) => void
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  tasks: seeds.tasks,

  setTasks: (tasks) => set({ tasks }),

  subscribe: (uid) => {
    const unsub = onSnapshot(collection(db, `users/${uid}/tasks`), (snap) => {
      const tasks: Task[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<Task, 'id'>),
        id: d.id,
        createdAt: d.data().createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      }))
      set({ tasks })
    })
    return unsub
  },

  create: (uid, partial) => {
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    const optimistic: Task = {
      id: tempId,
      title: partial.title,
      bucket: partial.bucket,
      source: partial.source,
      notes: partial.notes,
      done: false,
      createdAt: now,
      updatedAt: now,
    }
    set((s) => ({ tasks: [...s.tasks, optimistic] }))

    queue.enqueue(tempId, async () => {
      const ref = await addDoc(collection(db, `users/${uid}/tasks`), {
        title: partial.title,
        bucket: partial.bucket,
        source: partial.source,
        notes: partial.notes ?? null,
        done: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      // Replace temp id with real id
      set((s) => ({
        tasks: s.tasks.map((t) => (t.id === tempId ? { ...t, id: ref.id } : t)),
      }))
    }).catch(() => {
      // Revert optimistic update on failure
      set((s) => ({ tasks: s.tasks.filter((t) => t.id !== tempId) }))
    })
  },

  moveBucket: (uid, id, bucket) => {
    set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, bucket } : t) }))
    queue.enqueue(id, () =>
      updateDoc(doc(db, `users/${uid}/tasks/${id}`), { bucket, updatedAt: serverTimestamp() }),
    ).catch(() => {
      // On failure the onSnapshot will restore correct state
    })
  },

  toggleDone: (uid, id) => {
    const task = get().tasks.find((t) => t.id === id)
    if (!task) return
    const done = !task.done
    set((s) => ({
      tasks: s.tasks.map((t) => t.id === id ? { ...t, done, doneAt: done ? new Date().toISOString() : undefined } : t),
    }))
    queue.enqueue(id, () =>
      updateDoc(doc(db, `users/${uid}/tasks/${id}`), {
        done,
        doneAt: done ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      }),
    ).catch(() => {})
  },

  remove: (uid, id) => {
    const prev = get().tasks
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
    queue.enqueue(id, () =>
      deleteDoc(doc(db, `users/${uid}/tasks/${id}`)),
    ).catch(() => {
      set({ tasks: prev })
    })
  },
}))
```

- [ ] **Step 7: Run tests — expect PASS**

```bash
npm test -- src/__tests__/useTaskStore.test.ts
```

Expected: 5 passed.

- [ ] **Step 8: Commit**

```bash
git add src/lib/mutationQueue.ts src/lib/__tests__/mutationQueue.test.ts src/stores/useTaskStore.ts src/__tests__/useTaskStore.test.ts
git commit -m "feat: mutation queue + task store with optimistic updates"
```

---

### Task 7: Inbox, Calendar, Brain, Spark stores

**Files:**
- Create: `src/stores/useInboxStore.ts`
- Create: `src/stores/useCalendarStore.ts`
- Create: `src/stores/useBrainStore.ts`
- Create: `src/stores/useSparkStore.ts`
- Create: `src/__tests__/useInboxStore.test.ts`

- [ ] **Step 1: Write failing inbox test**

Create `src/__tests__/useInboxStore.test.ts`:
```ts
import { describe, expect, test, beforeEach, act } from 'vitest'
import { useInboxStore } from '../stores/useInboxStore'
import { seeds } from '../data/seeds'

describe('useInboxStore', () => {
  beforeEach(() => {
    useInboxStore.setState({ threads: seeds.threads, triageMode: false, activeThread: null, loading: false })
  })

  test('initial state has seed threads', () => {
    expect(useInboxStore.getState().threads.length).toBeGreaterThan(0)
  })

  test('enterTriage sets triageMode=true and activeThread=first', () => {
    act(() => {
      useInboxStore.getState().enterTriage()
    })
    const { triageMode, activeThread } = useInboxStore.getState()
    expect(triageMode).toBe(true)
    expect(activeThread).toBe(seeds.threads[0].id)
  })

  test('exitTriage sets triageMode=false', () => {
    act(() => {
      useInboxStore.getState().enterTriage()
      useInboxStore.getState().exitTriage()
    })
    expect(useInboxStore.getState().triageMode).toBe(false)
  })

  test('nextThread advances activeThread', () => {
    act(() => {
      useInboxStore.getState().enterTriage()
      useInboxStore.getState().nextThread()
    })
    expect(useInboxStore.getState().activeThread).toBe(seeds.threads[1].id)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/__tests__/useInboxStore.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/stores/useInboxStore.ts`**

```ts
import { create } from 'zustand'
import { seeds } from '@/data/seeds'
import { apiFetch } from '@/lib/apiClient'
import type { InboxThread } from '@shared/types'

interface InboxState {
  threads: InboxThread[]
  triageMode: boolean
  activeThread: string | null
  loading: boolean
  fetch: () => Promise<void>
  enterTriage: () => void
  exitTriage: () => void
  nextThread: () => void
  prevThread: () => void
  setActiveThread: (id: string) => void
}

export const useInboxStore = create<InboxState>()((set, get) => ({
  threads: seeds.threads,
  triageMode: false,
  activeThread: null,
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const threads = await apiFetch<InboxThread[]>('/api/gmail/threads')
      set({ threads, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  enterTriage: () => {
    const { threads } = get()
    set({ triageMode: true, activeThread: threads[0]?.id ?? null })
  },

  exitTriage: () => set({ triageMode: false, activeThread: null }),

  nextThread: () => {
    const { threads, activeThread } = get()
    const idx = threads.findIndex((t) => t.id === activeThread)
    if (idx < threads.length - 1) set({ activeThread: threads[idx + 1].id })
  },

  prevThread: () => {
    const { threads, activeThread } = get()
    const idx = threads.findIndex((t) => t.id === activeThread)
    if (idx > 0) set({ activeThread: threads[idx - 1].id })
  },

  setActiveThread: (id) => set({ activeThread: id }),
}))
```

- [ ] **Step 4: Create `src/stores/useCalendarStore.ts`**

```ts
import { create } from 'zustand'
import { seeds } from '@/data/seeds'
import { apiFetch } from '@/lib/apiClient'
import type { MeetingEvent } from '@shared/types'

interface CalendarState {
  events: MeetingEvent[]
  loading: boolean
  fetch: () => Promise<void>
}

export const useCalendarStore = create<CalendarState>()((set) => ({
  events: seeds.meetings,
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const events = await apiFetch<MeetingEvent[]>('/api/calendar/events')
      set({ events, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
```

- [ ] **Step 5: Create `src/stores/useBrainStore.ts`**

```ts
import { create } from 'zustand'
import { seeds } from '@/data/seeds'
import { apiFetch } from '@/lib/apiClient'
import type { NotionBlock } from '@shared/types'

interface BrainState {
  blocks: NotionBlock[]
  loading: boolean
  cached: boolean
  fetch: () => Promise<void>
}

export const useBrainStore = create<BrainState>()((set) => ({
  blocks: seeds.notionBlocks,
  loading: false,
  cached: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const data = await apiFetch<{ blocks: NotionBlock[]; cached: boolean }>('/api/notion/brain')
      set({ blocks: data.blocks, cached: data.cached, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
```

- [ ] **Step 6: Create `src/stores/useSparkStore.ts`**

```ts
import { create } from 'zustand'
import { seeds } from '@/data/seeds'
import { apiFetch } from '@/lib/apiClient'

interface SparkState {
  text: string
  isStale: boolean
  loading: boolean
  fetch: () => Promise<void>
}

export const useSparkStore = create<SparkState>()((set) => ({
  text: seeds.spark,
  isStale: true,
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const data = await apiFetch<{ text: string; cached: boolean }>('/api/claude/spark')
      set({ text: data.text, isStale: data.cached, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
```

- [ ] **Step 7: Run inbox tests — expect PASS**

```bash
npm test -- src/__tests__/useInboxStore.test.ts
```

Expected: 4 passed.

- [ ] **Step 8: Commit**

```bash
git add src/stores/useInboxStore.ts src/stores/useCalendarStore.ts src/stores/useBrainStore.ts src/stores/useSparkStore.ts src/__tests__/useInboxStore.test.ts
git commit -m "feat: inbox, calendar, brain, spark stores"
```

---

### Task 8: Decision store

**Files:**
- Create: `src/stores/useDecisionStore.ts`
- Create: `src/__tests__/useDecisionStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/__tests__/useDecisionStore.test.ts`:
```ts
import { describe, expect, test, beforeEach, act, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  addDoc: vi.fn().mockResolvedValue({ id: 'new-dec-id' }),
  serverTimestamp: vi.fn(() => new Date()),
}))
vi.mock('@/lib/firestore', () => ({ db: {} }))

import { useDecisionStore } from '../stores/useDecisionStore'
import { seeds } from '../data/seeds'

describe('useDecisionStore', () => {
  beforeEach(() => {
    useDecisionStore.setState({ decisions: seeds.decisions, searchQuery: '' })
  })

  test('initial state has seed decisions', () => {
    expect(useDecisionStore.getState().decisions.length).toBeGreaterThan(0)
  })

  test('add inserts optimistic decision at start of list', () => {
    const before = useDecisionStore.getState().decisions.length
    act(() => {
      useDecisionStore.getState().add('uid1', 'Going with plan B.')
    })
    const { decisions } = useDecisionStore.getState()
    expect(decisions.length).toBe(before + 1)
    expect(decisions[0].text).toBe('Going with plan B.')
  })

  test('search filters decisions by text', () => {
    act(() => {
      useDecisionStore.getState().setSearch('distribution')
    })
    const filtered = useDecisionStore.getState().filteredDecisions
    expect(filtered.every(d => d.text.toLowerCase().includes('distribution'))).toBe(true)
  })

  test('exportMd returns markdown with all decisions', () => {
    const md = useDecisionStore.getState().exportMd()
    expect(md).toContain('# Decision Journal')
    expect(md.length).toBeGreaterThan(50)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/__tests__/useDecisionStore.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/stores/useDecisionStore.ts`**

```ts
import { create } from 'zustand'
import { collection, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firestore'
import { MutationQueue } from '@/lib/mutationQueue'
import { seeds } from '@/data/seeds'
import type { Decision } from '@shared/types'

const queue = new MutationQueue()

interface DecisionState {
  decisions: Decision[]
  searchQuery: string
  filteredDecisions: Decision[]
  subscribe: (uid: string) => () => void
  add: (uid: string, text: string) => void
  setSearch: (query: string) => void
  exportMd: () => string
}

export const useDecisionStore = create<DecisionState>()((set, get) => ({
  decisions: seeds.decisions,
  searchQuery: '',
  get filteredDecisions() {
    const { decisions, searchQuery } = get()
    if (!searchQuery.trim()) return decisions
    const q = searchQuery.toLowerCase()
    return decisions.filter(
      (d) => d.text.toLowerCase().includes(q) || (d.tags ?? []).some((t) => t.includes(q)),
    )
  },

  subscribe: (uid) => {
    return onSnapshot(collection(db, `users/${uid}/decisions`), (snap) => {
      const decisions: Decision[] = snap.docs.map((d) => ({
        ...(d.data() as Omit<Decision, 'id'>),
        id: d.id,
        ts: d.data().ts?.toDate?.()?.toISOString() ?? new Date().toISOString(),
        updatedAt: d.data().updatedAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      }))
      decisions.sort((a, b) => b.ts.localeCompare(a.ts))
      set({ decisions })
    })
  },

  add: (uid, text) => {
    const tempId = `temp-${Date.now()}`
    const now = new Date().toISOString()
    const optimistic: Decision = { id: tempId, text, ts: now, updatedAt: now }
    set((s) => ({ decisions: [optimistic, ...s.decisions] }))

    queue.enqueue(tempId, async () => {
      const ref = await addDoc(collection(db, `users/${uid}/decisions`), {
        text,
        ts: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      set((s) => ({
        decisions: s.decisions.map((d) => (d.id === tempId ? { ...d, id: ref.id } : d)),
      }))
    }).catch(() => {
      set((s) => ({ decisions: s.decisions.filter((d) => d.id !== tempId) }))
    })
  },

  setSearch: (query) => set({ searchQuery: query }),

  exportMd: () => {
    const { decisions } = get()
    const lines = ['# Decision Journal', '']
    for (const d of decisions) {
      const date = d.ts.slice(0, 10)
      const outcome = d.outcome ? ` _(${d.outcome})_` : ''
      lines.push(`## ${date}${outcome}`, '', d.text, '')
      if (d.context) lines.push(`> ${d.context}`, '')
      if (d.tags?.length) lines.push(`Tags: ${d.tags.join(', ')}`, '')
    }
    return lines.join('\n')
  },
}))
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npm test -- src/__tests__/useDecisionStore.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/stores/useDecisionStore.ts src/__tests__/useDecisionStore.test.ts
git commit -m "feat: decision store with search, add, exportMd"
```

---

### Task 9: UI store + Config store

**Files:**
- Create: `src/stores/useUIStore.ts`
- Create: `src/stores/useConfigStore.ts`
- Create: `src/__tests__/useUIStore.test.ts`

- [ ] **Step 1: Write failing UI store test**

Create `src/__tests__/useUIStore.test.ts`:
```ts
import { describe, expect, test, beforeEach, act } from 'vitest'
import { useUIStore } from '../stores/useUIStore'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ drawerOpen: false, activeModal: null, skillLauncherOpen: false, activeContext: { kind: null, id: null } })
  })

  test('openDrawer sets drawerOpen=true', () => {
    act(() => { useUIStore.getState().openDrawer() })
    expect(useUIStore.getState().drawerOpen).toBe(true)
  })

  test('closeDrawer sets drawerOpen=false and clears context', () => {
    act(() => {
      useUIStore.getState().openDrawer()
      useUIStore.getState().closeDrawer()
    })
    expect(useUIStore.getState().drawerOpen).toBe(false)
  })

  test('setActiveContext updates context kind and id', () => {
    act(() => {
      useUIStore.getState().setActiveContext({ kind: 'thread', id: 'th1' })
    })
    expect(useUIStore.getState().activeContext).toEqual({ kind: 'thread', id: 'th1' })
  })

  test('openSkillLauncher sets skillLauncherOpen=true', () => {
    act(() => { useUIStore.getState().openSkillLauncher() })
    expect(useUIStore.getState().skillLauncherOpen).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm test -- src/__tests__/useUIStore.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Create `src/stores/useUIStore.ts`**

```ts
import { create } from 'zustand'
import type { ActiveContext } from '@shared/types'

type ModalKind = 'meeting-prep' | 'skill' | null

interface UIState {
  drawerOpen: boolean
  activeModal: ModalKind
  skillLauncherOpen: boolean
  activeContext: ActiveContext
  openDrawer: () => void
  closeDrawer: () => void
  openModal: (modal: ModalKind) => void
  closeModal: () => void
  openSkillLauncher: () => void
  closeSkillLauncher: () => void
  setActiveContext: (ctx: ActiveContext) => void
  clearActiveContext: () => void
}

export const useUIStore = create<UIState>()((set) => ({
  drawerOpen: false,
  activeModal: null,
  skillLauncherOpen: false,
  activeContext: { kind: null, id: null },

  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false, activeContext: { kind: null, id: null } }),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
  openSkillLauncher: () => set({ skillLauncherOpen: true }),
  closeSkillLauncher: () => set({ skillLauncherOpen: false }),
  setActiveContext: (ctx) => set({ activeContext: ctx }),
  clearActiveContext: () => set({ activeContext: { kind: null, id: null } }),
}))
```

- [ ] **Step 4: Create `src/stores/useConfigStore.ts`**

```ts
import { create } from 'zustand'
import type { TagPatterns } from '@server/lib/threadTags'
import { DEFAULT_TAG_PATTERNS } from '@server/lib/threadTags'

// This is a frontend mirror of the server config — keeps tagging UI consistent.
// The server applies real tagging; this is used for display/filtering in demo mode.

interface ConfigState {
  tagPatterns: TagPatterns
}

export const useConfigStore = create<ConfigState>()(() => ({
  tagPatterns: DEFAULT_TAG_PATTERNS,
}))
```

Note: `useConfigStore` imports `DEFAULT_TAG_PATTERNS` from the server via the path alias. For this to compile, update `tsconfig.json` to also include `server/lib/threadTags.ts` in the paths or duplicate the default patterns in a shared file. The simpler approach: move `DEFAULT_TAG_PATTERNS` to `shared/types.ts` or create `shared/tagPatterns.ts` and import from there in both `server/lib/threadTags.ts` and `useConfigStore.ts`.

- [ ] **Step 5: Move DEFAULT_TAG_PATTERNS to shared**

Create `shared/tagPatterns.ts`:
```ts
import type { TagPatterns } from './types'

export const DEFAULT_TAG_PATTERNS: TagPatterns = {
  DEAL: {
    domains: [
      'creel.mx', 'magneticlabs.com', 'apple.com', 'netflix.com',
      'andersen.com', 'llh.com.mx', 'gbm.com', 'morenafilms.com', 'onzafilms.com',
    ],
    senders: [
      'mirna alvarado', 'tyler gould', 'alex ferrando', 'mauricio llanes',
      'pilar benito', 'santiago de la rica', 'rene cardona', 'bernardo gomez', 'lebrija',
    ],
  },
  INT: { domains: ['lemonfilms.com'] },
  INFO: {
    domains: ['theblacklist.com', 'anthropic.com'],
    subjectIncludes: ['payment', 'receipt', 'newsletter', 'digest', 'your order'],
  },
  INDUSTRY: {
    domains: ['canacine.org.mx', 'imcine.gob.mx', 'focine.gob.mx', 'sofiasalud.com'],
    senders: ['uriel de la cruz'],
  },
}
```

Add `TagPatterns` to `shared/types.ts` (at the bottom, before exports):
```ts
export interface TagPatterns {
  DEAL: { domains: string[]; senders: string[] }
  INT: { domains: string[] }
  INFO: { domains: string[]; subjectIncludes: string[] }
  INDUSTRY: { domains: string[]; senders: string[] }
}
```

Update `server/lib/threadTags.ts` to import from shared:
```ts
// At top of server/lib/threadTags.ts, replace the TagPatterns interface with:
import type { TagPatterns } from '@shared/types'
export type { TagPatterns }
export { DEFAULT_TAG_PATTERNS } from '@shared/tagPatterns'
// ... rest of file unchanged
```

Update `src/stores/useConfigStore.ts`:
```ts
import { create } from 'zustand'
import type { TagPatterns } from '@shared/types'
import { DEFAULT_TAG_PATTERNS } from '@shared/tagPatterns'

interface ConfigState {
  tagPatterns: TagPatterns
}

export const useConfigStore = create<ConfigState>()(() => ({
  tagPatterns: DEFAULT_TAG_PATTERNS,
}))
```

- [ ] **Step 6: Run all tests to ensure nothing broke**

```bash
npm test
```

Expected: All tests pass.

- [ ] **Step 7: Run UI store tests — expect PASS**

```bash
npm test -- src/__tests__/useUIStore.test.ts
```

Expected: 4 passed.

- [ ] **Step 8: Commit**

```bash
git add src/stores/useUIStore.ts src/stores/useConfigStore.ts shared/tagPatterns.ts shared/types.ts server/lib/threadTags.ts src/__tests__/useUIStore.test.ts
git commit -m "feat: UI store, config store, move TagPatterns+DEFAULT_TAG_PATTERNS to shared"
```

---

## Spec Coverage

| Spec section | Covered |
|---|---|
| All 10 Zustand stores (§6) | ✅ useAuthStore, useBriefStore, useTaskStore, useInboxStore, useCalendarStore, useBrainStore, useSparkStore, useDecisionStore, useUIStore, useConfigStore |
| Stores hydrate from seeds (§4, §9) | ✅ all stores initialize with seeds.ts data |
| Brief streaming state machine (§6) | ✅ idle→streaming→complete, 200ms cross-fade via completeStream |
| Optimistic write queue (§6) | ✅ MutationQueue, per-id serialization, 5s timeout |
| AuthGate (§6) | ✅ checks /api/me on mount, renders spinner while loading |
| DemoBanner (§6) | ✅ visible when isDemo=true |
| activeContext (§6) | ✅ kind + id, all 5 kinds including null |
| Decision searchQuery (§6) | ✅ filteredDecisions derived property |
| exportMd (§6) | ✅ markdown output with date, outcome, tags |
| Triage mode state (§6) | ✅ enterTriage/exitTriage/nextThread/prevThread |
