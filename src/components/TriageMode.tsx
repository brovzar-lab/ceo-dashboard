import { useEffect, useState } from 'react'
import { useInboxStore } from '@/stores/useInboxStore'
import { useUIStore } from '@/stores/useUIStore'

const KEYBOARD_HELP = [
  { key: 'H / M / L', action: 'Tag HOT / MED / LOW' },
  { key: 'R', action: 'Reply in BillyDrawer' },
  { key: 'A', action: 'Archive' },
  { key: 'S', action: 'Snooze' },
  { key: 'E', action: 'Read in BillyDrawer' },
  { key: 'J / →', action: 'Next thread' },
  { key: 'K / ←', action: 'Previous thread' },
  { key: 'ESC', action: 'Exit triage' },
  { key: '?', action: 'Toggle this help' },
]

export function TriageMode() {
  const { threads, activeThread, exitTriage, nextThread, prevThread } = useInboxStore()
  const { openDrawer, setActiveContext } = useUIStore()
  const [showHelp, setShowHelp] = useState(false)

  const active = threads.find((t) => t.id === activeThread)

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key.toLowerCase()) {
        case 'escape': exitTriage(); break
        case 'j':
        case 'arrowright': nextThread(); break
        case 'k':
        case 'arrowleft': prevThread(); break
        case '?': setShowHelp((v) => !v); break
        case 'e':
          if (active) {
            setActiveContext({ kind: 'thread', id: active.id })
            openDrawer()
          }
          break
        case 'a':
          nextThread()
          break
      }
    }

    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [active, exitTriage, nextThread, prevThread, openDrawer, setActiveContext])

  if (!active) return null

  return (
    <div className="fixed inset-0 z-50 bg-bg-base flex flex-col" data-testid="triage-mode">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-soft">
        <span className="text-xs font-body font-medium text-text-muted uppercase tracking-widest">Triage Mode</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setShowHelp((v) => !v)} className="text-xs text-text-muted hover:text-text-secondary font-body">?</button>
          <button type="button" onClick={exitTriage} className="text-xs font-body text-text-muted hover:text-text-secondary">ESC to exit</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-2xl mx-auto w-full">
        <div className="mb-2 flex items-center gap-2">
          <span className={`text-xs font-body font-medium px-2 py-0.5 rounded-full ${
            active.priority === 'HOT' ? 'bg-accent-coral/20 text-accent-coral' :
            active.priority === 'MED' ? 'bg-accent-sage/20 text-accent-sage' :
            'bg-bg-elevated text-text-muted'
          }`}>
            {active.priority}
          </span>
          <span className="text-xs text-text-muted font-body">{active.tag}</span>
        </div>
        <h2 className="font-body text-xl font-medium text-text-primary mb-1">{active.subject}</h2>
        <p className="text-sm text-text-secondary font-body mb-4">From: {active.from}</p>
        <p className="font-body text-sm text-text-secondary leading-relaxed">{active.snippet}</p>
      </div>

      {showHelp && (
        <div data-testid="keyboard-help" className="absolute bottom-16 right-4 bg-bg-elevated border border-border-medium rounded-xl p-4 shadow-xl w-64">
          <p className="text-xs font-body font-semibold text-text-secondary mb-3 uppercase tracking-widest">Keyboard Shortcuts</p>
          {KEYBOARD_HELP.map(({ key, action }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <kbd className="text-[11px] font-body bg-bg-surface px-1.5 py-0.5 rounded text-text-muted">{key}</kbd>
              <span className="text-[11px] font-body text-text-tertiary">{action}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
