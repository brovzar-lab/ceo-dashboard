import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import { useInboxStore } from '@/stores/useInboxStore'
import { apiFetch } from '@/lib/apiClient'

export function SkillModal() {
  const { activeModal, closeModal, activeContext } = useUIStore()
  const threads = useInboxStore((s) => s.threads)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [useLastOutput, setUseLastOutput] = useState(false)

  useEffect(() => {
    if (activeModal !== 'skill') { setInput(''); setOutput(''); return }
    if (activeContext.kind === 'thread') {
      const thread = threads.find((t) => t.id === activeContext.id)
      if (thread) setInput(`Subject: ${thread.subject}\nFrom: ${thread.from}\n\n${thread.snippet}`)
    }
  }, [activeModal, activeContext])

  if (activeModal !== 'skill') return null

  const run = async () => {
    if (!input.trim()) return
    setLoading(true)
    setOutput('')
    try {
      const data = await apiFetch<unknown>('/api/claude/chat', {
        method: 'POST',
        body: JSON.stringify({ message: input }),
      })
      setOutput(typeof data === 'string' ? data : JSON.stringify(data))
    } catch {
      setOutput('Error: request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close skill modal" className="absolute inset-0 bg-black/60 cursor-default" onClick={closeModal} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-modal-title"
        className="relative w-full max-w-lg bg-bg-elevated border border-border-medium rounded-2xl p-5 shadow-2xl flex flex-col gap-4 max-h-[80vh]"
      >
        <div className="flex items-center justify-between">
          <h2 id="skill-modal-title" className="text-sm font-body font-semibold text-text-primary">Skill</h2>
          <button type="button" aria-label="Close" onClick={closeModal} className="text-text-muted hover:text-text-secondary text-xl leading-none">×</button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          className="w-full text-sm font-body bg-bg-surface border border-border-soft rounded-lg px-3 py-2.5 text-text-primary outline-none focus:border-border-medium resize-none"
          placeholder="Paste context or describe what you need…"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={run}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-accent-lemon text-bg-base text-sm font-body font-medium rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {loading ? 'Running…' : 'Run'}
          </button>
          <label className="flex items-center gap-1.5 text-xs font-body text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={useLastOutput}
              onChange={(e) => setUseLastOutput(e.target.checked)}
              className="accent-accent-lemon"
            />
            Use last result as input
          </label>
        </div>
        {output && (
          <div className="flex-1 overflow-y-auto p-3 bg-bg-surface rounded-lg border border-border-soft">
            <p className="text-sm font-body text-text-secondary leading-relaxed whitespace-pre-wrap">{output}</p>
          </div>
        )}
      </div>
    </div>
  )
}
