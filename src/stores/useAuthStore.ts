import { create } from 'zustand'

interface User {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isDemo: boolean
  loading: boolean
  setUser: (user: User) => void
  clearUser: () => void
  setLoading: (loading: boolean) => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isDemo: true,
  loading: true,

  setUser: (user) => set({ user, isAuthenticated: true, isDemo: false, loading: false }),

  clearUser: () => set({ user: null, isAuthenticated: false, isDemo: true, loading: false }),

  setLoading: (loading) => set({ loading }),

  checkAuth: async () => {
    try {
      const res = await fetch('/api/me')
      if (res.ok) {
        const json = await res.json()
        set({ user: json.data, isAuthenticated: true, isDemo: false, loading: false })
      } else {
        set({ user: null, isAuthenticated: false, isDemo: true, loading: false })
      }
    } catch {
      set({ user: null, isAuthenticated: false, isDemo: true, loading: false })
    }
  },
}))
