import { useInboxStore } from '@/stores/useInboxStore'
import { useCalendarStore } from '@/stores/useCalendarStore'
import { useBrainStore } from '@/stores/useBrainStore'
import { useBriefStore } from '@/stores/useBriefStore'
import { SyncingPill } from './SyncingPill'

export function Header() {
  const fetchInbox = useInboxStore((s) => s.fetch)
  const fetchCalendar = useCalendarStore((s) => s.fetch)
  const fetchBrain = useBrainStore((s) => s.fetch)
  const refreshBrief = useBriefStore((s) => s.refresh)

  const syncAll = () => {
    fetchInbox()
    fetchCalendar()
    fetchBrain()
    refreshBrief(true)
  }

  return (
    <header className="sticky top-0 z-40 bg-bg-base/90 backdrop-blur-sm border-b border-border-soft px-4 py-3 flex items-center justify-between">
      <span className="font-display text-lg font-semibold text-text-primary tracking-tight">
        Lemon Studios
      </span>
      <div className="flex items-center gap-3">
        <SyncingPill />
        <button
          onClick={syncAll}
          className="text-xs font-body font-medium text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5 rounded-md border border-border-soft hover:border-border-medium"
        >
          Sync All
        </button>
        <a
          href="/auth/google/logout"
          className="text-xs font-body text-text-muted hover:text-text-tertiary transition-colors"
        >
          Sign out
        </a>
      </div>
    </header>
  )
}
