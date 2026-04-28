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
