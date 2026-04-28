import { describe, expect, test, vi, beforeAll } from 'vitest'

vi.mock('./firebase', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ refreshToken: { ciphertext: 'c', iv: 'i', tag: 't' } }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}))

vi.mock('./encryption', () => ({
  decrypt: vi.fn().mockReturnValue('decrypted-refresh-token'),
  encrypt: vi.fn().mockReturnValue({ ciphertext: 'c2', iv: 'i2', tag: 't2' }),
}))

vi.mock('./tokenCache', () => ({
  getOrRefreshToken: vi.fn().mockResolvedValue('fresh-access-token'),
}))

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({
        setCredentials: vi.fn(),
        refreshAccessToken: vi.fn().mockResolvedValue({
          credentials: { access_token: 'new-at', expiry_date: Date.now() + 3600000 },
        }),
      })),
    },
    gmail: vi.fn().mockReturnValue({ users: { threads: {} } }),
    calendar: vi.fn().mockReturnValue({ events: {} }),
  },
}))

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = 'cid'
  process.env.GOOGLE_CLIENT_SECRET = 'csec'
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost/callback'
})

import { getGmailClient, getCalendarClient } from './googleAuth'

describe('googleAuth', () => {
  test('getGmailClient returns a gmail client', async () => {
    const client = await getGmailClient('uid1')
    expect(client).toBeDefined()
    expect(client.users).toBeDefined()
  })

  test('getCalendarClient returns a calendar client', async () => {
    const client = await getCalendarClient('uid1')
    expect(client).toBeDefined()
  })
})
