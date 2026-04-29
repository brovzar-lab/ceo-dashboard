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
  onReply?: (thread: InboxThread) => void
}

export function ThreadList({ threads, onReply }: Props) {
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
        <div key={thread.id} className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-bg-elevated transition-colors w-full">
          <button
            type="button"
            onClick={() => openThread(thread)}
            className="flex items-start gap-3 flex-1 min-w-0 text-left"
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
          {onReply && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onReply(thread) }}
              className="opacity-0 group-hover:opacity-100 text-[10px] font-body font-medium text-accent-lemon hover:text-text-primary transition-all px-2 py-1 rounded border border-border-soft mt-1 flex-shrink-0"
            >
              Reply
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

