import { useState } from 'react'
import { useTaskStore } from '@/stores/useTaskStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { TaskColumn } from './TaskColumn'
import type { Bucket } from '@shared/types'

const BUCKETS: Bucket[] = ['now', 'next', 'orbit']

export function TasksPanel() {
  const tasks = useTaskStore((s) => s.tasks)
  const create = useTaskStore((s) => s.create)
  const user = useAuthStore((s) => s.user)
  const [newTitle, setNewTitle] = useState('')
  const [addingTo, setAddingTo] = useState<Bucket | null>(null)

  const addTask = (bucket: Bucket) => {
    if (!newTitle.trim() || !user) return
    create(user.uid, { title: newTitle.trim(), bucket, source: 'manual' })
    setNewTitle('')
    setAddingTo(null)
  }

  return (
    <div className="bg-bg-surface border border-border-soft rounded-xl p-4">
      <h2 className="text-[10px] font-body font-semibold text-text-muted tracking-widest uppercase mb-4">Tasks</h2>
      <div className="grid grid-cols-3 gap-3 divide-x divide-border-soft">
        {BUCKETS.map((bucket) => (
          <div key={bucket} className="px-2 first:pl-0 last:pr-0">
            <TaskColumn
              bucket={bucket}
              tasks={tasks.filter((t) => t.bucket === bucket)}
            />
            {addingTo === bucket ? (
              <div className="mt-2 flex gap-1">
                <input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addTask(bucket); if (e.key === 'Escape') setAddingTo(null) }}
                  className="flex-1 text-xs font-body bg-bg-elevated border border-border-medium rounded px-2 py-1 text-text-primary outline-none focus:border-accent-lemon/40"
                  placeholder="Add task…"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingTo(bucket)}
                className="mt-2 text-[11px] text-text-muted hover:text-text-secondary font-body transition-colors w-full text-left"
              >
                + add
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
