import { create } from 'zustand'
import { seeds } from '@/data/seeds'
import { startBriefStream } from '@/lib/briefStream'

interface BriefState {
  jarvis: string
  billy: string
  isStale: boolean
  isStreaming: boolean
  generatedAt: string | null
  briefId: string | null

  beginStream: () => void
  setCached: (brief: { jarvis: string; billy: string; generatedAt?: string; isDemo?: boolean }) => void
  appendToken: (voice: 'jarvis' | 'billy', text: string) => void
  completeStream: (brief: { jarvis: string; billy: string; generatedAt: string; briefId: string }) => void
  revertToLast: () => void
  refresh: (forceRefresh?: boolean) => () => void
}

export const useBriefStore = create<BriefState>()((set, get) => ({
  jarvis: seeds.brief.jarvis,
  billy: seeds.brief.billy,
  isStale: false,
  isStreaming: false,
  generatedAt: null,
  briefId: null,

  beginStream: () => set({ isStreaming: true, isStale: true }),

  setCached: (brief) =>
    set({
      jarvis: brief.jarvis,
      billy: brief.billy,
      generatedAt: brief.generatedAt ?? null,
      isStale: true,
    }),

  appendToken: (voice, text) =>
    set((s) =>
      voice === 'jarvis'
        ? { jarvis: s.jarvis + text }
        : { billy: s.billy + text },
    ),

  completeStream: (brief) =>
    set({
      jarvis: brief.jarvis,
      billy: brief.billy,
      generatedAt: brief.generatedAt,
      briefId: brief.briefId,
      isStreaming: false,
      isStale: false,
    }),

  revertToLast: () => {
    const { jarvis, billy } = get()
    set({ isStreaming: false, isStale: jarvis === seeds.brief.jarvis })
  },

  refresh: (forceRefresh = false) => {
    const { beginStream, setCached, appendToken, completeStream, revertToLast } = get()
    beginStream()
    // Reset streaming buffers
    set({ jarvis: '', billy: '' })
    return startBriefStream(forceRefresh, {
      onCached: (e) => setCached({ jarvis: e.jarvis, billy: e.billy, generatedAt: e.generatedAt }),
      onToken: (voice, text) => appendToken(voice, text),
      onDone: (e) => completeStream({ jarvis: e.jarvis, billy: e.billy, generatedAt: e.generatedAt, briefId: e.briefId }),
      onError: () => revertToLast(),
    })
  },
}))
