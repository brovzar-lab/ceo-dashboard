import { describe, expect, test } from 'vitest'
import request from 'supertest'
import express from 'express'
import { makeRateLimit } from './rateLimit'

function makeApp(windowMs: number, max: number) {
  const app = express()
  app.use((req: any, _res, next) => {
    req.sessionID = 'test-session'
    next()
  })
  app.get('/resource', makeRateLimit(windowMs, max), (_req, res) => res.json({ ok: true }))
  return app
}

describe('makeRateLimit', () => {
  test('allows requests under the limit', async () => {
    const app = makeApp(60_000, 5)
    const res = await request(app).get('/resource')
    expect(res.status).toBe(200)
  })

  test('returns 429 RATE_LIMITED after limit exceeded', async () => {
    const app = makeApp(60_000, 2)
    await request(app).get('/resource')
    await request(app).get('/resource')
    const res = await request(app).get('/resource')
    expect(res.status).toBe(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
    expect(res.body.error.retryable).toBe(true)
  })

  test('429 response includes rate limit header', async () => {
    const app = makeApp(60_000, 1)
    await request(app).get('/resource')
    const res = await request(app).get('/resource')
    expect(res.status).toBe(429)
    expect(res.headers['ratelimit-reset'] || res.headers['retry-after'] || res.headers['x-ratelimit-reset']).toBeDefined()
  })
})
