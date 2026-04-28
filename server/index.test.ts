import { describe, expect, test } from 'vitest'
import request from 'supertest'
import { app } from './index'

describe('Express server', () => {
  test('GET /health returns 200 with ok:true', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ ok: true })
  })

  test('GET /unknown returns 404', async () => {
    const res = await request(app).get('/unknown-route-xyz')
    expect(res.status).toBe(404)
  })
})
