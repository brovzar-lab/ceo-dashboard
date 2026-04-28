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
    setAccessToken('uid1', 'tok123', Date.now() + 30_000)
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
