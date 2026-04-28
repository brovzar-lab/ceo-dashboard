import { describe, expect, test, vi } from 'vitest'
import request from 'supertest'
import express from 'express'

const { mockNotionRetrieve, mockNotionBlockChildren, mockCacheGet, mockCacheSet } = vi.hoisted(() => ({
  mockNotionRetrieve: vi.fn(),
  mockNotionBlockChildren: vi.fn(),
  mockCacheGet: vi.fn(),
  mockCacheSet: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@notionhq/client', () => ({
  Client: vi.fn().mockImplementation(() => ({
    pages: { retrieve: mockNotionRetrieve },
    blocks: { children: { list: mockNotionBlockChildren } },
  })),
}))

vi.mock('../lib/firebase', () => ({
  db: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ get: mockCacheGet, set: mockCacheSet })),
    })),
  },
}))

import { notionRouter } from './notion'

function makeApp() {
  const app = express()
  app.use(express.json())
  app.use((req: any, _res, next) => {
    req.session = { uid: 'uid1', cookie: {} }
    next()
  })
  app.use('/api/notion', notionRouter)
  return app
}

describe('GET /api/notion/brain', () => {
  test('returns cached blocks when cache is fresh and last_edited_time matches', async () => {
    const cachedBlocks = [{ id: 'b1', type: 'paragraph', text: 'cached' }]
    mockCacheGet.mockResolvedValue({
      exists: true,
      data: () => ({
        blocks: cachedBlocks,
        lastEditedTime: '2026-04-28T10:00:00.000Z',
        cachedAt: { toDate: () => new Date(Date.now() - 1 * 60 * 60 * 1000) },
      }),
    })
    mockNotionRetrieve.mockResolvedValue({ last_edited_time: '2026-04-28T10:00:00.000Z' })

    const res = await request(makeApp()).get('/api/notion/brain')
    expect(res.status).toBe(200)
    expect(res.body.data.blocks).toEqual(cachedBlocks)
    expect(res.body.data.cached).toBe(true)
  })

  test('fetches fresh blocks when cache is stale (> 24h)', async () => {
    mockCacheGet.mockResolvedValue({
      exists: true,
      data: () => ({
        blocks: [],
        lastEditedTime: 'old',
        cachedAt: { toDate: () => new Date(Date.now() - 25 * 60 * 60 * 1000) },
      }),
    })
    mockNotionRetrieve.mockResolvedValue({ last_edited_time: '2026-04-28T12:00:00.000Z' })
    mockNotionBlockChildren.mockResolvedValue({
      results: [{ id: 'b1', type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'fresh' }] } }],
      has_more: false,
    })

    const res = await request(makeApp()).get('/api/notion/brain')
    expect(res.status).toBe(200)
    expect(mockNotionBlockChildren).toHaveBeenCalled()
  })
})
