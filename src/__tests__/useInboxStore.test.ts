import { describe, expect, test, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useInboxStore } from '../stores/useInboxStore'
import { seeds } from '../data/seeds'

describe('useInboxStore', () => {
  beforeEach(() => {
    useInboxStore.setState({ threads: seeds.threads, triageMode: false, activeThread: null, loading: false })
  })

  test('initial state has seed threads', () => {
    expect(useInboxStore.getState().threads.length).toBeGreaterThan(0)
  })

  test('enterTriage sets triageMode=true and activeThread=first', () => {
    act(() => {
      useInboxStore.getState().enterTriage()
    })
    const { triageMode, activeThread } = useInboxStore.getState()
    expect(triageMode).toBe(true)
    expect(activeThread).toBe(seeds.threads[0].id)
  })

  test('exitTriage sets triageMode=false', () => {
    act(() => {
      useInboxStore.getState().enterTriage()
      useInboxStore.getState().exitTriage()
    })
    expect(useInboxStore.getState().triageMode).toBe(false)
  })

  test('nextThread advances activeThread', () => {
    act(() => {
      useInboxStore.getState().enterTriage()
      useInboxStore.getState().nextThread()
    })
    expect(useInboxStore.getState().activeThread).toBe(seeds.threads[1].id)
  })
})
