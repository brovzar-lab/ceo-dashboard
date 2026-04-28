import { describe, expect, test, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useUIStore } from '../stores/useUIStore'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ drawerOpen: false, activeModal: null, skillLauncherOpen: false, activeContext: { kind: null, id: null } })
  })

  test('openDrawer sets drawerOpen=true', () => {
    act(() => { useUIStore.getState().openDrawer() })
    expect(useUIStore.getState().drawerOpen).toBe(true)
  })

  test('closeDrawer sets drawerOpen=false and clears context', () => {
    act(() => {
      useUIStore.getState().openDrawer()
      useUIStore.getState().closeDrawer()
    })
    expect(useUIStore.getState().drawerOpen).toBe(false)
  })

  test('setActiveContext updates context kind and id', () => {
    act(() => {
      useUIStore.getState().setActiveContext({ kind: 'thread', id: 'th1' })
    })
    expect(useUIStore.getState().activeContext).toEqual({ kind: 'thread', id: 'th1' })
  })

  test('openSkillLauncher sets skillLauncherOpen=true', () => {
    act(() => { useUIStore.getState().openSkillLauncher() })
    expect(useUIStore.getState().skillLauncherOpen).toBe(true)
  })
})
