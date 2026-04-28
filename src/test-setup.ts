import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Default: unauthenticated
global.fetch = vi.fn().mockResolvedValue({
  ok: false,
  status: 401,
  json: () => Promise.resolve({ error: { code: 'UNAUTHENTICATED', message: 'Not signed in', retryable: false } }),
} as any)
