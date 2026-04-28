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
