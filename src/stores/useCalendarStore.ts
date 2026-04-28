import { create } from 'zustand'
import { seeds } from '@/data/seeds'
import { apiFetch } from '@/lib/apiClient'
import type { MeetingEvent } from '@shared/types'

interface CalendarState {
  events: MeetingEvent[]
  loading: boolean
  fetch: () => Promise<void>
}

export const useCalendarStore = create<CalendarState>()((set) => ({
  events: seeds.meetings,
  loading: false,

  fetch: async () => {
    set({ loading: true })
    try {
      const events = await apiFetch<MeetingEvent[]>('/api/calendar/events')
      set({ events, loading: false })
    } catch {
      set({ loading: false })
    }
  },
}))
