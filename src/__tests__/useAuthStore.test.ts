import { describe, expect, test, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthStore } from '../stores/useAuthStore'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isDemo: true, loading: false })
  })

  test('initial state is unauthenticated demo mode', () => {
    const { user, isAuthenticated, isDemo } = useAuthStore.getState()
    expect(user).toBeNull()
    expect(isAuthenticated).toBe(false)
    expect(isDemo).toBe(true)
  })

  test('setUser marks authenticated and exits demo mode', () => {
    act(() => {
      useAuthStore.getState().setUser({ uid: 'u1', email: 'billy@lemonfilms.com' })
    })
    const { user, isAuthenticated, isDemo } = useAuthStore.getState()
    expect(user).toMatchObject({ uid: 'u1' })
    expect(isAuthenticated).toBe(true)
    expect(isDemo).toBe(false)
  })

  test('clearUser reverts to demo mode', () => {
    act(() => {
      useAuthStore.getState().setUser({ uid: 'u1', email: 'b@b.com' })
      useAuthStore.getState().clearUser()
    })
    const { isAuthenticated, isDemo } = useAuthStore.getState()
    expect(isAuthenticated).toBe(false)
    expect(isDemo).toBe(true)
  })
})
