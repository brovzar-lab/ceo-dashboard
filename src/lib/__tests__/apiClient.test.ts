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
