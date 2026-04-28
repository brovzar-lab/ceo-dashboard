import { describe, expect, test, beforeEach, vi } from 'vitest'
import { encrypt, decrypt } from './encryption'

describe('encryption', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(64)
  })

  test('encrypt then decrypt returns original plaintext', () => {
    const { ciphertext, iv, tag } = encrypt('my-super-secret-refresh-token')
    const result = decrypt(ciphertext, iv, tag)
    expect(result).toBe('my-super-secret-refresh-token')
  })

  test('encrypt produces different ciphertext each call (random IV)', () => {
    const r1 = encrypt('same-plaintext')
    const r2 = encrypt('same-plaintext')
    expect(r1.ciphertext).not.toBe(r2.ciphertext)
    expect(r1.iv).not.toBe(r2.iv)
  })

  test('decrypt throws on tampered ciphertext', () => {
    const { iv, tag } = encrypt('secret')
    expect(() => decrypt(Buffer.from('tampered').toString('base64'), iv, tag)).toThrow()
  })

  test('throws if TOKEN_ENCRYPTION_KEY is not set', async () => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    vi.resetModules()
    const mod = await import('./encryption')
    expect(() => mod.encrypt('test')).toThrow('TOKEN_ENCRYPTION_KEY')
  })
})
