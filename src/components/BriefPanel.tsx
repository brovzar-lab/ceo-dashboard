import { useBriefStore } from '@/stores/useBriefStore'

export function BriefPanel() {
  const { jarvis, billy, isStale, isStreaming } = useBriefStore()

  return (
    <section
      aria-label="Morning Brief"
      className="mt-4 p-5 bg-bg-surface border border-border-soft rounded-xl"
      style={{ transition: 'opacity 200ms ease-in-out', opacity: isStreaming ? 0.8 : 1 }}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-sm font-medium text-text-tertiary uppercase tracking-widest">
          Morning Brief
        </h2>
        {isStale && (
          <span
            data-testid="brief-stale-badge"
            className="text-xs text-text-muted font-body px-2 py-0.5 rounded-full border border-border-soft"
          >
            updating…
          </span>
        )}
      </div>

      <div className="space-y-4">
        <p
          data-testid="brief-jarvis"
          className="font-display text-[19px] leading-relaxed text-text-primary"
        >
          {jarvis}
        </p>
        <div className="border-t border-border-soft pt-4">
          <p
            data-testid="brief-billy"
            className="font-body text-[15px] leading-relaxed text-text-secondary"
          >
            {billy}
          </p>
        </div>
      </div>
    </section>
  )
}
