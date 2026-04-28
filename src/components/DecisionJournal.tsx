import { useState } from 'react'
import { useDecisionStore } from '@/stores/useDecisionStore'
import { useAuthStore } from '@/stores/useAuthStore'

export function DecisionJournal() {
  const { decisions, searchQuery, filteredDecisions, add, setSearch, exportMd } = useDecisionStore()
  const user = useAuthStore((s) => s.user)
  const [draft, setDraft] = useState('')

  const submit = () => {
    if (!draft.trim() || !user) return
    add(user.uid, draft.trim())
    setDraft('')
  }

  const handleExport = () => {
    const md = exportMd()
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `decisions-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-bg-surface border border-border-soft rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[10px] font-body font-semibold text-text-muted tracking-widest uppercase">Decisions</h2>
        <button type="button" onClick={handleExport} className="text-[11px] font-body text-text-muted hover:text-text-secondary transition-colors">
          Export
        </button>
      </div>

      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder="Log a decision…"
        className="w-full text-sm font-body bg-bg-elevated border border-border-soft rounded-lg px-3 py-2 text-text-primary placeholder:text-text-muted outline-none focus:border-border-medium transition-colors"
      />

      <input
        value={searchQuery}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search decisions…"
        className="w-full text-xs font-body bg-transparent border border-border-soft rounded-lg px-3 py-1.5 text-text-secondary placeholder:text-text-muted outline-none focus:border-border-medium transition-colors"
      />

      <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
        {filteredDecisions.map((d) => (
          <div key={d.id} className="p-2.5 rounded-lg hover:bg-bg-elevated transition-colors">
            <p className="text-sm font-body text-text-secondary leading-relaxed">{d.text}</p>
            <p className="text-[10px] text-text-muted font-body mt-1">{d.ts.slice(0, 10)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
