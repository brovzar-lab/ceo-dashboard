import { Router } from 'express'
import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from '../lib/firebase'
import { getGmailClient } from '../lib/googleAuth'
import { JARVIS_SYSTEM, BILLY_SYSTEM, SPARK_SYSTEM, CHAT_SYSTEM, PROMPT_VERSION } from '../lib/prompts'
import { requireAuth } from '../middleware/requireAuth'
import { csrfCheck } from '../middleware/csrfCheck'
import { briefLimit, chatLimit, sparkLimit } from '../middleware/rateLimit'
import { seeds } from '@shared/seeds'

export const claudeRouter = Router()
claudeRouter.use(requireAuth)

const MODEL_BRIEF = 'claude-opus-4-7'
const MODEL_CHAT = 'claude-sonnet-4-6'
const MODEL_SPARK = 'claude-haiku-4-5-20251001'

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

function computeBriefId(threadIds: string[]): string {
  const hash = crypto
    .createHash('sha256')
    .update(threadIds.slice(0, 12).join(':') + PROMPT_VERSION + MODEL_BRIEF)
    .digest('hex')
    .slice(0, 16)
  return hash + '-' + new Date().toISOString().slice(0, 10)
}

claudeRouter.post('/brief', csrfCheck, briefLimit, async (req, res) => {
  const uid = req.session.uid!
  const { forceRefresh = false } = req.body

  let threadIds: string[] = []
  try {
    const gmail = await getGmailClient(uid)
    const response = await gmail.users.threads.list({ userId: 'me', maxResults: 12 })
    threadIds = (response.data.threads || []).map((t: any) => t.id)
  } catch {
    // fallback: empty threadIds
  }

  const briefId = computeBriefId(threadIds)

  if (!forceRefresh) {
    const cacheDoc = await db.collection(`users/${uid}/briefs`).doc(briefId).get()
    if (cacheDoc.exists) {
      const cached = cacheDoc.data()!
      return res.json({ data: { ...cached, isStale: false }, streaming: false })
    }
  }

  let staleBrief: { jarvis: string; billy: string; generatedAt?: string } | null = null
  const lastBriefSnap = await db
    .collection(`users/${uid}/briefs`)
    .orderBy('generatedAt', 'desc')
    .limit(1)
    .get()
  if (!lastBriefSnap.empty) {
    const d = lastBriefSnap.docs[0].data()
    staleBrief = { jarvis: d.jarvis, billy: d.billy, generatedAt: d.generatedAt?.toDate?.()?.toISOString() }
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendEvent = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`)

  const initial = staleBrief ?? { jarvis: seeds.brief.jarvis, billy: seeds.brief.billy, isDemo: true }
  sendEvent({ type: 'cached', ...initial, isStale: true })

  const anthropic = getAnthropicClient()
  let jarvisText = ''
  let billyText = ''

  try {
    const inboxContext = threadIds.length
      ? `Top inbox thread IDs: ${threadIds.slice(0, 12).join(', ')}`
      : 'Inbox unavailable — generate briefing based on general priorities.'

    const jarvisStream: any = anthropic.messages.stream({
      model: MODEL_BRIEF,
      max_tokens: 800,
      system: JARVIS_SYSTEM,
      messages: [{ role: 'user', content: `Today is ${new Date().toDateString()}. ${inboxContext}` }],
    } as any)
    for await (const text of jarvisStream.textStream) {
      jarvisText += text
      sendEvent({ type: 'token', voice: 'jarvis', text })
    }

    const billyStream: any = anthropic.messages.stream({
      model: MODEL_CHAT,
      max_tokens: 400,
      system: BILLY_SYSTEM,
      messages: [{ role: 'user', content: jarvisText }],
    } as any)
    for await (const text of billyStream.textStream) {
      billyText += text
      sendEvent({ type: 'token', voice: 'billy', text })
    }

    const generatedAt = new Date()
    await db.collection(`users/${uid}/briefs`).doc(briefId).set({
      jarvis: jarvisText,
      billy: billyText,
      generatedAt: FieldValue.serverTimestamp(),
      inboxSnapshot: threadIds.slice(0, 12),
      model: MODEL_BRIEF,
      promptVersion: String(PROMPT_VERSION),
      expiresAt: new Date(generatedAt.getTime() + 90 * 60 * 1000),
    })

    sendEvent({ type: 'done', jarvis: jarvisText, billy: billyText, generatedAt: generatedAt.toISOString(), briefId })
  } catch {
    sendEvent({ type: 'error', message: 'Brief generation failed' })
  }

  res.end()
})

claudeRouter.post('/chat', csrfCheck, chatLimit, async (req, res) => {
  const { message, context } = req.body as { message: string; context?: string }
  const contextNote = context ? `\n\nContext:\n${context}` : ''

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const anthropic = getAnthropicClient()
  try {
    const stream: any = anthropic.messages.stream({
      model: MODEL_CHAT,
      max_tokens: 1024,
      system: CHAT_SYSTEM,
      messages: [{ role: 'user', content: message + contextNote }],
    } as any)
    for await (const text of stream.textStream) {
      res.write(`data: ${JSON.stringify({ type: 'token', text })}\n\n`)
    }
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
  } catch {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Chat failed' })}\n\n`)
  }
  res.end()
})

claudeRouter.post('/spark', csrfCheck, sparkLimit, async (req, res) => {
  const uid = req.session.uid!

  const cacheDoc = await db.collection(`users/${uid}/spark_cache`).doc('current').get()
  if (cacheDoc.exists) {
    const data = cacheDoc.data()!
    const expiresAt: number = data.expiresAt?.toMillis?.() ?? 0
    if (expiresAt > Date.now()) {
      return res.json({ data: { text: data.text, cached: true } })
    }
  }

  const anthropic = getAnthropicClient()
  try {
    const response = await anthropic.messages.create({
      model: MODEL_SPARK,
      max_tokens: 150,
      system: SPARK_SYSTEM,
      messages: [{ role: 'user', content: 'Generate a spark question.' }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    await db.collection(`users/${uid}/spark_cache`).doc('current').set({
      text,
      generatedAt: FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    })
    res.json({ data: { text, cached: false } })
  } catch {
    res.status(500).json({ error: { code: 'UPSTREAM_ERROR', message: 'Spark generation failed', retryable: true } })
  }
})
