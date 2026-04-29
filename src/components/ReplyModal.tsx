import React, { useState, useEffect } from 'react'
import { TONE_TIERS } from '../lib/voiceProfile'
import type { ToneTier } from '../lib/voiceProfile'

interface EmailContext {
  from: string
  fromEmail: string
  subject: string
  snippet: string
  toneTier?: string
}

interface Props {
  email: EmailContext | null
  onClose: () => void
}

export default function ReplyModal({ email, onClose }: Props) {
  const [tier, setTier] = useState<ToneTier>('peer')
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!email) return
    setTier((email.toneTier as ToneTier) ?? 'peer')
  }, [email])

  useEffect(() => {
    if (!email) return
    generate((email.toneTier as ToneTier) ?? 'peer')
  }, [email])

  async function generate(useTier: ToneTier) {
    if (!email) return
    setLoading(true)
    setDraft('')

    try {
      const csrfRes = await fetch('/api/csrf', { credentials: 'include' })
      const csrfData = await csrfRes.json()
      const csrfToken = csrfData.data?.token || ''

      const res = await fetch('/api/claude/draft-reply', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          email: {
            from: email.from,
            fromEmail: email.fromEmail,
            subject: email.subject,
            snippet: email.snippet,
          },
          toneTier: useTier,
        }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.type === 'token') {
                accumulated += parsed.text
                setDraft(accumulated)
              } else if (parsed.type === 'done') {
                accumulated = parsed.draft || accumulated
                setDraft(accumulated)
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setDraft('Could not draft reply. Please try again.')
    }
    setLoading(false)
  }

  function handleTierChange(t: ToneTier) {
    setTier(t)
    generate(t)
  }

  function copy() {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!email) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content reply-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <span className="modal-title">Reply to {email.from}</span>
          <button onClick={onClose} className="modal-close">&times;</button>
        </div>

        {/* Email summary */}
        <div className="reply-context">
          <div className="reply-subject">Re: {email.subject}</div>
          <div className="reply-snippet">{email.snippet}</div>
        </div>

        {/* Tone tier switcher */}
        <div className="tone-switcher">
          <span className="tone-label">Tone:</span>
          {(Object.entries(TONE_TIERS) as [ToneTier, typeof TONE_TIERS[ToneTier]][]).map(([k, v]) => (
            <button
              key={k}
              onClick={() => handleTierChange(k)}
              title={v.desc}
              className={`tone-btn ${tier === k ? 'active' : ''}`}
              style={tier === k ? { background: v.color, color: '#fff' } : {}}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Draft area */}
        <div className="reply-draft-area">
          {loading ? (
            <div className="reply-loading">
              <div className="spinner" />
              Drafting in your voice...
            </div>
          ) : (
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={8}
              className="reply-textarea"
              placeholder="Draft will appear here..."
            />
          )}
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button onClick={() => generate(tier)} disabled={loading} className="reply-redraft-btn">
            Re-draft
          </button>
          <div className="modal-actions-right">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={copy} disabled={loading || !draft} className="btn-primary">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
