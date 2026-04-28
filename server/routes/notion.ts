import { Router } from 'express'
import { Client as NotionClient } from '@notionhq/client'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../lib/firebase'
import { requireAuth } from '../middleware/requireAuth'
import { notionLimit } from '../middleware/rateLimit'
import type { NotionBlock, NotionBlockType } from '@shared/types'

export const notionRouter = Router()
notionRouter.use(requireAuth)

const BRAIN_PAGE_ID = process.env.NOTION_BRAIN_PAGE_ID ?? ''
const CACHE_TTL_MS = 24 * 60 * 60 * 1000

function getNotionClient() {
  return new NotionClient({ auth: process.env.NOTION_API_KEY })
}

function richTextToString(richText: any[]): string {
  return (richText ?? []).map((r: any) => r.plain_text).join('')
}

function blockToNotionBlock(raw: any): NotionBlock {
  const type = raw.type as NotionBlockType
  const content = raw[type]
  const text = content?.rich_text ? richTextToString(content.rich_text) : ''
  return { id: raw.id, type, text, url: content?.url }
}

async function fetchBlocksFromNotion(pageId: string): Promise<{ blocks: NotionBlock[]; lastEditedTime: string }> {
  const notion = getNotionClient()
  const [page, children] = await Promise.all([
    notion.pages.retrieve({ page_id: pageId }),
    notion.blocks.children.list({ block_id: pageId, page_size: 100 }),
  ])
  const blocks = (children as any).results.map((b: any) => blockToNotionBlock(b))
  return { blocks, lastEditedTime: (page as any).last_edited_time ?? new Date().toISOString() }
}

async function getBlocksWithCache(uid: string, pageId: string): Promise<{ blocks: NotionBlock[]; cached: boolean }> {
  const cacheRef = db.collection(`users/${uid}/notion_cache`).doc(pageId)
  const cacheDoc = await cacheRef.get()

  if (cacheDoc.exists) {
    const data = cacheDoc.data()!
    const cachedAt: Date = data.cachedAt?.toDate?.() ?? new Date(0)
    const ageMs = Date.now() - cachedAt.getTime()

    if (ageMs < CACHE_TTL_MS) {
      const notion = getNotionClient()
      const page = await notion.pages.retrieve({ page_id: pageId })
      if ((page as any).last_edited_time === data.lastEditedTime) {
        return { blocks: data.blocks as NotionBlock[], cached: true }
      }
    }
  }

  const { blocks, lastEditedTime } = await fetchBlocksFromNotion(pageId)
  await cacheRef.set({
    blocks,
    lastEditedTime,
    cachedAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + CACHE_TTL_MS),
  })
  return { blocks, cached: false }
}

notionRouter.get('/brain', notionLimit, async (req, res) => {
  const uid = req.session.uid!
  try {
    const { blocks, cached } = await getBlocksWithCache(uid, BRAIN_PAGE_ID)
    res.json({ data: { blocks, cached } })
  } catch {
    res.status(500).json({ error: { code: 'UPSTREAM_ERROR', message: 'Notion unavailable', retryable: true } })
  }
})
