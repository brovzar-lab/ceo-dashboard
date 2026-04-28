import { describe, expect, test, vi, beforeEach } from 'vitest'

const mockAdd = vi.fn().mockResolvedValue({ id: 'log1' })
vi.mock('./firebase', () => ({
  db: { collection: vi.fn(() => ({ add: mockAdd })) },
}))
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: vi.fn(() => new Date()) },
}))

import { writeAuditLog } from './auditLog'

describe('writeAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
