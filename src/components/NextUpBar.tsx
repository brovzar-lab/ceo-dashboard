import { useCalendarStore } from '@/stores/useCalendarStore'
import { useUIStore } from '@/stores/useUIStore'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function NextUpBar() {
  const events = useCalendarStore((s) => s.events)
  const openModal = useUIStore((s) => s.openModal)
  const required = events.filter((e) => e.isRequired)

  if (!required.length) return null

  return (
    <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
      <span className="text-xs text-text-muted font-body font-medium shrink-0">Next up:</span>
      {required.map((meeting) => (
        <button
          key={meeting.id}
          type="button"
          data-testid="meeting-pill"
          onClick={() => openModal('meeting-prep')}
          className="shrink-0 flex items-center gap-2 px-3 py-1.5 bg-bg-elevated border border-border-soft rounded-lg text-xs font-body text-text-secondary hover:border-border-medium hover:text-text-primary transition-colors"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent-coral shrink-0" />
          <span className="font-medium">{formatTime(meeting.start)}</span>
          <span className="text-text-tertiary max-w-[160px] truncate">{meeting.title}</span>
        </button>
      ))}
    </div>
  )
}
