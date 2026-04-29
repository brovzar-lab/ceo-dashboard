import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '../lib/firebase'
import { getGmailClient } from '../lib/googleAuth'
import { requireAuth } from '../middleware/requireAuth'
import { csrfCheck } from '../middleware/csrfCheck'

export const voiceRouter = Router()
voiceRouter.use(requireAuth)

const MODEL = 'claude-sonnet-4-6'

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
}

// GET /api/voice-profile — load user's voice profile
voiceRouter.get('/', async (req, res) => {
  const uid = req.session.uid!
  try {
    const snap = await db.collection('users').doc(uid).collection('voiceProfile').doc('current').get()
    if (snap.exists) {
      return res.json({ data: snap.data() })
    }
  } catch {}
  // return defaults
  res.json({
    data: {
      trained: false,
      emailsAnalyzed: 0,
      lastUpdated: null,
      summary: "Direct, peer-to-peer. Bilingual ES/EN, code-switches mid-sentence with inner circle. Never uses em dashes. Short sentences. Skips pleasantries when context allows. Signs off with 'Billy' or nothing.",
      patterns: {
        openings: ['Quick one:', 'Heads up:', 'Just confirming:', 'OK so:'],
        closings: ['Billy', 'B.'],
        avoid: ['em dashes', 'I hope this finds you well', 'circling back', 'to be honest'],
        signature: 'Billy',
      },
      tones: {
        inner: 'Casual, direct, mixed Spanish/English. Skip greetings. First names only.',
        peer: 'Warm but efficient. Standard greetings okay. Match their language.',
        exec: 'Crisp, careful. No slang. Always English unless they wrote ES.',
        legal: 'Precise, formal-ish. Reference specifics. No casual asides.',
        talent: 'Generous, encouraging. Lead with the positive. Match their energy.',
      },
    },
  })
})

// PUT /api/voice-profile — save approved profile
voiceRouter.put('/', csrfCheck, async (req, res) => {
  const uid = req.session.uid!
  const profile = req.body
  try {
    await db.collection('users').doc(uid).collection('voiceProfile').doc('current').set(profile)
    res.json({ data: { ok: true } })
  } catch (err) {
    res.status(500).json({ error: { message: 'Failed to save voice profile' } })
  }
})

// POST /api/voice-profile/train — analyze sent emails and propose profile
voiceRouter.post('/train', csrfCheck, async (req, res) => {
  const uid = req.session.uid!

  // 1. Fetch last 50 sent emails
  let sentEmails: string[] = []
  try {
    const gmail = await getGmailClient(uid)
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      q: 'in:sent',
      maxResults: 50,
    })

    const messageIds = (listRes.data.messages || []).map((m: any) => m.id)

    // Fetch each message's snippet
    const fetched = await Promise.all(
      messageIds.slice(0, 50).map(async (id: string) => {
        try {
          const msg = await gmail.users.messages.get({ userId: 'me', id, format: 'metadata' })
          const headers = msg.data.payload?.headers || []
          const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
          const to = headers.find((h: any) => h.name === 'To')?.value || ''
          return `To: ${to}\nSubject: ${subject}\nSnippet: ${msg.data.snippet || ''}`
        } catch {
          return null
        }
      }),
    )

    sentEmails = fetched.filter(Boolean) as string[]
  } catch (err: any) {
    console.error('[voice/train] Gmail fetch error:', err?.message || err)
    return res.status(400).json({ error: { message: 'Could not read sent emails. Re-authenticate with Google.' } })
  }

  if (sentEmails.length === 0) {
    return res.status(400).json({ error: { message: 'No sent emails found to analyze.' } })
  }

  // 2. Send to Claude for analysis
  const anthropic = getAnthropicClient()
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: `You are analyzing a CEO's sent emails to extract their writing voice profile. Return ONLY valid JSON with this exact structure:
{
  "summary": "2-3 sentence description of their writing style",
  "patterns": {
    "openings": ["common opening phrases"],
    "closings": ["common sign-offs"],
    "avoid": ["phrases or patterns they never use"],
    "signature": "how they sign off"
  },
  "tones": {
    "inner": "description of tone with inner team",
    "peer": "description of tone with professional peers",
    "exec": "description of tone with executives/board",
    "legal": "description of tone in legal/formal context",
    "talent": "description of tone with talent/creative partners"
  }
}

Analyze language patterns, code-switching (ES/EN), formality levels, and signature habits. NEVER use em dashes in your output.`,
      messages: [
        {
          role: 'user',
          content: `Analyze these ${sentEmails.length} sent emails and extract the voice profile:\n\n${sentEmails.join('\n---\n')}`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({ error: { message: 'Could not parse voice analysis' } })
    }

    const parsed = JSON.parse(jsonMatch[0])
    const proposed = {
      trained: true,
      emailsAnalyzed: sentEmails.length,
      lastUpdated: new Date().toISOString(),
      summary: parsed.summary || '',
      patterns: {
        openings: parsed.patterns?.openings || [],
        closings: parsed.patterns?.closings || [],
        avoid: parsed.patterns?.avoid || [],
        signature: parsed.patterns?.signature || 'Billy',
      },
      tones: {
        inner: parsed.tones?.inner || '',
        peer: parsed.tones?.peer || '',
        exec: parsed.tones?.exec || '',
        legal: parsed.tones?.legal || '',
        talent: parsed.tones?.talent || '',
      },
    }

    res.json({ data: { proposed, emailsAnalyzed: sentEmails.length } })
  } catch (err: any) {
    console.error('[voice/train] Claude analysis error:', err?.message || err)
    res.status(500).json({ error: { message: 'Voice analysis failed: ' + (err?.message || 'unknown error') } })
  }
})
