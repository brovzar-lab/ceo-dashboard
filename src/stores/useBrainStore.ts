import { create } from 'zustand'
import { seeds } from '@/data/seeds'
import { apiFetch } from '@/lib/apiClient'
import type { NotionBlock } from '@shared/types'

interface BrainState {
  blocks: NotionBlock[]
  loading: boolean
  cached: boolean
  fetch: () => Promise<void>
}

export const useBrainStore = create<BrainState>()((set) => ({
  blocks: seeds.notionBlocks,
  loading: false,
  cached: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const data = await apiFetch<{ blocks: NotionBlock[]; cached: boolean }>('/api/notion/brain')
      set({ blocks: data.blocks, cached: data.cached, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
