import { useState, useRef, useEffect } from 'react'
import { useUIStore } from '@/stores/useUIStore'
import { useInboxStore } from '@/stores/useInboxStore'
import { parseSseEvent } from '@/lib/briefStream'

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export function BillyDrawer() {
  const { drawerOpen, closeDrawer, activeContext } = useUIStore()
  const threads = useInboxStore((s) => s.threads)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (endRef.current && typeof endRef.current.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (!drawerOpen) return null

  const activeThread = activeContext.kind === 'thread'
    ? threads.find((t) => t.id === activeContext.id)
    : null

  const send = async () => {
    if (!input.trim() || streaming) return
    const userMsg = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: userMsg }])
    setStreaming(true)

    let assistantText = ''
    setMessages((m) => [...m, { role: 'assistant', text: '' }])

    const context = activeThread
      ? `Thread context:\nSubject: ${activeThread.subject}\nFrom: ${activeThread.from}\n\n${activeThread.snippet}`
      : undefined

    try {
      const response = await fetch('/api/claude/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context }),
      })

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const event = parseSseEvent(line.trim())
          if (event?.type === 'token') {
            assistantText += event.text
            setMessages((m) => {
              const updated = [...m]
              updated[updated.length - 1] = { role: 'assistant', text: assistantText }
              return updated
            })
          }
        }
      }
    } catch {
      setMessages((m) => {
        const updated = [...m]
        updated[updated.length - 1] = { role: 'assistant', text: 'Error: request failed' }
        return updated
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div
      data-testid="billy-drawer"
      role="complementary"
      aria-label="Billy AI assistant"
      className="fixed top-0 right-0 h-full z-50 flex flex-col bg-bg-elevated border-l border-border-medium shadow-2xl w-full md:w-[420px]"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft">
        <div>
          <span className="font-body font-semibold text-sm text-text-primary">Billy</span>
          {activeThread && (
            <p className="text-[11px] text-text-muted font-body mt-0.5 truncate max-w-[280px]">{activeThread.subject}</p>
          )}
        </div>
        <button
          type="button"
          onClick={closeDrawer}
          aria-label="Close"
          className="text-text-muted hover:text-text-secondary text-xl leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-sm font-body text-text-muted text-center mt-8">
            {activeThread ? `Discussing: ${activeThread.subject}` : 'What do you need?'}
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm font-body leading-relaxed ${
              msg.role === 'user'
                ? 'bg-accent-lemon text-bg-base rounded-br-sm'
                : 'bg-bg-surface text-text-secondary rounded-bl-sm border border-border-soft'
            }`}>
              {msg.text || (streaming && msg.role === 'assistant' ? '▊' : '')}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border-soft p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder="Message Billy…"
          className="flex-1 text-sm font-body bg-bg-surface border border-border-soft rounded-xl px-3.5 py-2.5 text-text-primary placeholder:text-text-muted outline-none focus:border-border-medium"
        />
        <button
          type="button"
          onClick={send}
          disabled={streaming || !input.trim()}
          className="px-4 py-2.5 bg-accent-lemon text-bg-base text-sm font-body font-medium rounded-xl hover:opacity-90 disabled:opacity-40 transition-opacity"
          aria-label="Send message"
        >
          →
        </button>
      </div>
    </div>
  )
}
