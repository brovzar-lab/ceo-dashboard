import { useInboxStore } from '@/stores/useInboxStore'
import { useUIStore } from '@/stores/useUIStore'
import type { InboxThread, ThreadPriority } from '@shared/types'

const PRIORITY_DOT: Record<ThreadPriority, string> = {
  HOT: 'bg-accent-coral',
  MED: 'bg-accent-sage',
  LOW: 'bg-border-medium',
}

interface Props {
  threads: InboxThread[]
}

export function ThreadList({ threads }: Props) {
  const setActiveThread = useInboxStore((s) => s.setActiveThread)
  const setActiveContext = useUIStore((s) => s.setActiveContext)
  const openDrawer = useUIStore((s) => s.openDrawer)

  const openThread = (thread: InboxThread) => {
    setActiveThread(thread.id)
    setActiveContext({ kind: 'thread', id: thread.id })
    openDrawer()
  }

  return (
    <div className="flex flex-col gap-0.5">
      {threads.map((thread) => (
        <button
          key={thread.id}
          type="button"
          onClick={() => openThread(thread)}
          className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-bg-elevated transition-colors text-left w-full"
        >
          <div className="mt-1.5 flex-shrink-0">
            <span className={`block w-2 h-2 rounded-full ${PRIORITY_DOT[thread.priority]}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-body font-medium truncate ${thread.unread ? 'text-text-primary' : 'text-text-secondary'}`}>
                {thread.from}
              </span>
              <span className="text-[10px] text-text-muted font-body flex-shrink-0">
                {new Date(thread.receivedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </div>
            <p className={`text-xs font-body truncate mt-0.5 ${thread.unread ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
              {thread.subject}
            </p>
            <p className="text-[11px] font-body text-text-muted truncate mt-0.5">{thread.snippet}</p>
          </div>
        </button>
      ))}
    </div>
  )
}
