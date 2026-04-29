import { useInboxStore } from '@/stores/useInboxStore'
import { useCalendarStore } from '@/stores/useCalendarStore'
import { useBrainStore } from '@/stores/useBrainStore'
import { useBriefStore } from '@/stores/useBriefStore'
import { SyncingPill } from './SyncingPill'

interface HeaderProps {
  onOpenSettings?: () => void
}

export function Header({ onOpenSettings }: HeaderProps) {
  const fetchInbox = useInboxStore((s) => s.fetch)
  const fetchCalendar = useCalendarStore((s) => s.fetch)
  const fetchBrain = useBrainStore((s) => s.fetch)
  const refreshBrief = useBriefStore((s) => s.refresh)
  const isStreaming = useBriefStore((s) => s.isStreaming)

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
        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-xs font-body text-text-muted hover:text-text-primary transition-colors px-2 py-1.5 rounded-md border border-border-soft hover:border-border-medium"
            title="Settings"
          >
            ⚙
          </button>
        )}
        <button
          type="button"
          onClick={syncAll}
          disabled={isStreaming}
          className="text-xs font-body font-medium text-text-secondary hover:text-text-primary transition-colors px-3 py-1.5 rounded-md border border-border-soft hover:border-border-medium disabled:opacity-40"
        >
          Sync All
        </button>
        {/* Logout is GET-only — no CSRF token required for this route */}
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

