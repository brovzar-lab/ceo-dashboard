export type ToneTier = 'inner' | 'peer' | 'exec' | 'legal' | 'talent'

export interface VoiceProfile {
  trained: boolean
  emailsAnalyzed: number
  lastUpdated: string | null
  summary: string
  patterns: {
    openings: string[]
    closings: string[]
    avoid: string[]
    signature: string
  }
  tones: {
    inner: string
    peer: string
    exec: string
    legal: string
    talent: string
  }
}

export const TONE_TIERS: Record<ToneTier, { label: string; color: string; desc: string }> = {
  inner:  { label: 'Inner',  color: '#8b5cf6', desc: 'Team, casual, mixed ES/EN' },
  peer:   { label: 'Peer',   color: '#3b82f6', desc: 'Professional warm, match language' },
  exec:   { label: 'Exec',   color: '#78716c', desc: 'Crisp, careful, no slang' },
  legal:  { label: 'Legal',  color: '#d97706', desc: 'Precise, formal, reference specifics' },
  talent: { label: 'Talent', color: '#059669', desc: 'Generous, encouraging' },
}

export const DEFAULT_VOICE_PROFILE: VoiceProfile = {
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
    inner:  'Casual, direct, mixed Spanish/English. Skip greetings. First names only.',
    peer:   'Warm but efficient. Standard greetings okay. Match their language.',
    exec:   'Crisp, careful. No slang. Always English unless they wrote ES.',
    legal:  'Precise, formal-ish. Reference specifics. No casual asides.',
    talent: 'Generous, encouraging. Lead with the positive. Match their energy.',
  },
}

export function buildVoicePrompt(profile: VoiceProfile, toneTier: ToneTier = 'peer'): string {
  const tone = profile.tones[toneTier] || profile.tones.peer
  return `BILLY ROVZAR'S VOICE PROFILE:
${profile.summary}

TONE FOR THIS RECIPIENT (${toneTier}): ${tone}

SIGNATURE PATTERNS:
- Openings he uses: ${profile.patterns.openings.join(', ') || 'direct openings, no preamble'}
- Closings: ${profile.patterns.closings.join(' or ') || 'Billy'}
- Always avoids: ${profile.patterns.avoid.join(', ') || 'em dashes, corporate speak'}

${profile.trained
  ? `Profile trained on ${profile.emailsAnalyzed} of his sent emails. Last updated ${profile.lastUpdated}.`
  : 'Profile not yet trained on real emails. Using base description.'}

NEVER use em dashes. Use commas or periods. Match the language of the original (ES or EN).`
}

export async function loadVoiceProfile(): Promise<VoiceProfile> {
  try {
    const res = await fetch('/api/voice-profile', { credentials: 'include' })
    if (res.ok) {
      const { data } = await res.json()
      return data
    }
  } catch {}
  return { ...DEFAULT_VOICE_PROFILE }
}

export async function saveVoiceProfile(profile: VoiceProfile): Promise<void> {
  const res = await fetch('/api/voice-profile', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || 'Failed to save voice profile')
  }
}

export async function trainVoiceProfile(): Promise<{ proposed: VoiceProfile; emailsAnalyzed: number }> {
  const res = await fetch('/api/voice-profile/train', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || 'Voice training failed')
  }
  const { data } = await res.json()
  return data
}
