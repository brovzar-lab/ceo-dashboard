import type { ThreadTag, ThreadPriority, TagPatterns } from '@shared/types'

export type { TagPatterns } from '@shared/types'
export { DEFAULT_TAG_PATTERNS } from '@shared/tagPatterns'

const MED_ACTION_VERBS = ['review', 'approve', 'decide', 'needs', 'deadline']
const HOT_OVERRIDE_RE = /\b(today|tomorrow|EOD|COB)\b/i
const HOT_FORCE_WORDS = ['URGENT', 'DEADLINE']

interface ThreadInput { from: string; fromDomain: string; subject: string; labels: string[] }

export function tagThread(thread: ThreadInput, patterns: TagPatterns): ThreadTag {
  const from = thread.from.toLowerCase()
  const domain = thread.fromDomain.toLowerCase()
  const subject = thread.subject.toLowerCase()

  if (patterns.DEAL.domains.some((d) => domain === d) || patterns.DEAL.senders.some((s) => from.includes(s))) return 'DEAL'
  if (patterns.INT.domains.some((d) => domain === d)) return 'INT'
  if (patterns.INFO.domains.some((d) => domain === d) || patterns.INFO.subjectIncludes.some((kw) => subject.includes(kw))) return 'INFO'
  if (patterns.INDUSTRY.domains.some((d) => domain === d) || patterns.INDUSTRY.senders.some((s) => from.includes(s))) return 'INDUSTRY'
  return 'NONE'
}

interface PriorityInput { tag: ThreadTag; unread: boolean; receivedAt: string; subject: string }

export function prioritizeThread(thread: PriorityInput): ThreadPriority {
  const ageMs = Date.now() - new Date(thread.receivedAt).getTime()
  const subject = thread.subject

  if (HOT_FORCE_WORDS.some((w) => subject.includes(w)) || HOT_OVERRIDE_RE.test(subject)) return 'HOT'
  if (ageMs > 7 * 24 * 60 * 60 * 1000) return 'LOW'

  if (thread.tag === 'DEAL') {
    return (thread.unread || ageMs < 12 * 60 * 60 * 1000) ? 'HOT' : 'MED'
  }
  if (thread.tag === 'INT') {
    const subjectLower = subject.toLowerCase()
    return MED_ACTION_VERBS.some((v) => subjectLower.includes(v)) ? 'MED' : 'LOW'
  }
  return 'LOW'
}
