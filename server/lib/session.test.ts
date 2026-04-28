import { describe, expect, test, vi, beforeEach } from 'vitest'

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
      expect.anything(),
    )
  })

  test('destroy deletes session doc', async () => {
    await new Promise<void>((resolve) => store.destroy('sid1', resolve))
    expect(mockDocDelete).toHaveBeenCalled()
  })
})
